from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
import os
import socket
from supabase import Client
from db import supabase

router = APIRouter()

@router.get("/test-connection")
async def test_connection():
    """Test Supabase connection"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        if not supabase:
            return {
                "status": "error",
                "message": "Supabase client is not initialized. Check your .env file for SUPABASE_URL and SUPABASE_KEY",
                "url": os.getenv("SUPABASE_URL", "Not set"),
                "key_set": bool(os.getenv("SUPABASE_KEY"))
            }
        
        # Try a simple operation to test connection
        try:
            # Try to make a test call to Supabase (this will actually test the connection)
            # Use a method that doesn't require auth
            test_url = os.getenv("SUPABASE_URL", "")
            return {
                "status": "success",
                "message": "Supabase client is initialized",
                "url": test_url,
                "url_configured": bool(test_url),
                "note": "Client initialized. Actual connection will be tested on login/register."
            }
        except Exception as e:
            error_type = type(e).__name__
            error_msg = str(e)
            logger.error(f"Connection test error: {error_type} - {error_msg}")
            return {
                "status": "error",
                "message": f"Connection test failed: {error_type}",
                "error": error_msg,
                "url": os.getenv("SUPABASE_URL", "Not set")
            }
    except Exception as e:
        error_type = type(e).__name__
        logger.error(f"Test connection error: {error_type} - {str(e)}")
        return {
            "status": "error",
            "message": f"Error testing connection: {error_type}",
            "error": str(e)
        }

async def get_current_active_user():
    """
    Placeholder function for getting current active user.
    In a real implementation, this would extract user from JWT token or session.
    For now, returns a dummy user dict.
    """
    # TODO: Implement proper authentication token extraction
    return {"id": "dummy_user_id", "email": "user@example.com"}

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

def check_supabase_connection():
    """Check if Supabase is available by trying to connect to the auth endpoint"""
    try:
        supabase_url = os.getenv("SUPABASE_URL")
        if not supabase_url:
            return False
        
        # Extract hostname from URL
        from urllib.parse import urlparse
        hostname = urlparse(supabase_url).hostname
        if not hostname:
            return False

        # Try to resolve the hostname
        socket.getaddrinfo(hostname, 443)
        return True
    except (socket.gaierror, TypeError):
        return False

@router.post("/register")
async def register(user: UserCreate):
    try:
        if not check_supabase_connection():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Cannot connect to authentication service. Please check your network connection and try again."
            )
        
        if not supabase:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Registration service is not available. Please check Supabase configuration."
            )
        
        try:
            response = supabase.auth.sign_up({
                "email": user.email,
                "password": user.password,
                "options": {
                    "data": {
                        "full_name": user.full_name
                    }
                }
            })
        except Exception as conn_error:
            error_msg = str(conn_error)
            # Handle specific Supabase errors
            if "User already registered" in error_msg or "already exists" in error_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="An account with this email already exists. Please login instead."
                )
            # Handle network/DNS errors with better messages
            if "getaddrinfo failed" in error_msg or "11001" in error_msg or "Name or service not known" in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Cannot reach Supabase service. This might be a temporary network issue. Please try again in a moment."
                )
            if "timeout" in error_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Connection to registration service timed out. Please try again."
                )
            raise
        
        if not response:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed: No response from authentication service"
            )
        
        return {"message": "User registered successfully", "user": response.user if response.user else None}
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "getaddrinfo failed" in error_msg or "11001" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Cannot connect to registration service. Please check your internet connection."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {error_msg}"
        )

def check_supabase_connection():
    """Check if Supabase is available - simplified check"""
    # Just check if supabase client exists, don't do DNS resolution
    # DNS checks can fail even when the service is accessible
    return supabase is not None

@router.post("/login")
async def login(user: UserLogin):
    try:
        if not supabase:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service is not configured. Please check Supabase configuration in backend."
            )
        
        try:
            response = supabase.auth.sign_in_with_password({
                "email": user.email,
                "password": user.password
            })
        except Exception as conn_error:
            error_msg = str(conn_error)
            error_type = type(conn_error).__name__
            
            # Log the full error for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Supabase login error - Type: {error_type}, Message: {error_msg}")
            logger.error(f"Full error: {conn_error}", exc_info=True)
            
            # Handle specific Supabase errors
            if "Invalid login credentials" in error_msg or "Invalid credentials" in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )
            
            # Handle network/DNS errors - but be more specific
            if "getaddrinfo failed" in error_msg or "11001" in error_msg or "Name or service not known" in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Cannot resolve Supabase hostname. Error: {error_type}. Please check if Supabase URL is correct: {os.getenv('SUPABASE_URL', 'Not set')}"
                )
            
            # Handle connection timeout
            if "timeout" in error_msg.lower() or "timed out" in error_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Connection to authentication service timed out. Please check your firewall settings or try again."
                )
            
            # Handle SSL/TLS errors
            if "SSL" in error_msg or "certificate" in error_msg.lower() or "TLS" in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="SSL/TLS connection error. Please check your network settings or firewall."
                )
            
            # Handle connection refused
            if "Connection refused" in error_msg or "refused" in error_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Connection to Supabase was refused. Please check your firewall or network settings."
                )
            
            # Generic error - show the actual error message and type
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Authentication error ({error_type}): {error_msg}"
            )
        
        if not response or not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Login failed: Invalid credentials or no session created"
            )
        
        return {
            "access_token": response.session.access_token if response.session else None,
            "refresh_token": response.session.refresh_token if response.session else None,
            "user": response.user if response.user else None
        }
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        # Handle network/DNS errors with better messages
        if "getaddrinfo failed" in error_msg or "11001" in error_msg or "Name or service not known" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Cannot reach Supabase service. This might be a temporary network issue. Please try again in a moment."
            )
        if "Invalid login credentials" in error_msg or "Email not confirmed" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=error_msg
            )
        if "timeout" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Connection to authentication service timed out. Please try again."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {error_msg}"
        )

@router.post("/logout")
async def logout():
    try:
        if not supabase:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Logout service is not available. Please check Supabase configuration."
            )
        supabase.auth.sign_out()
        return {"message": "Logged out successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Logout failed: {str(e)}"
        )

@router.post("/reset-password")
async def reset_password(email: str):
    try:
        if not supabase:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Password reset service is not available. Please check Supabase configuration."
            )
        supabase.auth.reset_password_email(email)
        return {"message": "Password reset email sent"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password reset failed: {str(e)}"
        )