import json
import uuid
import hashlib
import requests
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

@csrf_exempt
@require_http_methods(["POST"])
def logout_user(request):
    """
    Logout API that integrates with e-Pramaan logout system
    """
    try:
        # Get session_id from request (could be from cookie, header, or request body)
        session_id = request.POST.get('session_id') or request.headers.get('X-Session-ID')
        
        if not session_id:
            return JsonResponse({
                "error": "session_id is required"
            }, status=400)
        
        # Get the session log entry
        try:
            session_log = EpramaanSessionLog.objects.get(session_id=session_id)
        except EpramaanSessionLog.DoesNotExist:
            return JsonResponse({
                "error": "Session not found"
            }, status=404)
        
        # Extract user details from session log
        username = session_log.username
        service_user_id = session_log.service_user_id
        
        # Generate logout request ID (UUID)
        logout_request_id = str(uuid.uuid4())
        
        # Generate HMAC (you need to implement this based on your existing method)
        # This is a placeholder - replace with your actual HMAC generation
        hmac_value = generate_hmac_for_logout(session_id, logout_request_id)
        
        # Prepare the JSON data as required by e-Pramaan
        logout_data = {
            "clientId": "1000009XX",  # Replace with your actual client ID
            "sessionId": session_id,
            "hmac": hmac_value,
            "iss": "ePramaan",
            "logoutRequestId": logout_request_id,
            "sub": service_user_id,  # From JWT token
            "redirectUrl": "http://10.184.43.25:5173/login",  # Your login page URL
            "customParameter": "logout_from_unified_dashboard"
        }
        
        # Convert to JSON string
        json_data = json.dumps(logout_data)
        
        # Prepare form data as required by e-Pramaan
        form_data = {
            'data': json_data
        }
        
        # Make POST request to e-Pramaan logout endpoint
        logout_url = "http://10.244.100.43:8080/openid/jwt/processOIDCSLORequest.do"
        
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        
        response = requests.post(
            logout_url,
            data=form_data,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            # Logout successful - clear session
            try:
                # Clear the session log entry
                session_log.delete()
            except Exception as e:
                print(f"Error clearing session log: {e}")
            
            return JsonResponse({
                "message": "Logout successful",
                "logout_request_id": logout_request_id,
                "redirect_url": logout_data["redirectUrl"]
            }, status=200)
        else:
            return JsonResponse({
                "error": f"Logout failed with status code: {response.status_code}",
                "response_text": response.text
            }, status=response.status_code)
            
    except Exception as e:
        return JsonResponse({
            "error": f"Logout error: {str(e)}"
        }, status=500)

def generate_hmac_for_logout(session_id, logout_request_id):
    """
    Generate HMAC for logout request
    Replace this with your actual HMAC generation method
    """
    # This is a placeholder - implement your actual HMAC generation
    # You should use the same method that was used during login
    message = f"{session_id}:{logout_request_id}"
    # Use your existing HMAC generation logic here
    return hashlib.sha256(message.encode()).hexdigest()

# Alternative logout function that accepts session_id as query parameter
@csrf_exempt
@require_http_methods(["POST"])
def logout_user_by_session_id(request):
    """
    Alternative logout API that accepts session_id as query parameter
    """
    try:
        session_id = request.GET.get('session_id')
        
        if not session_id:
            return JsonResponse({
                "error": "session_id query parameter is required"
            }, status=400)
        
        # Rest of the logout logic remains the same
        return logout_user_logic(session_id)
        
    except Exception as e:
        return JsonResponse({
            "error": f"Logout error: {str(e)}"
        }, status=500)

def logout_user_logic(session_id):
    """
    Common logout logic that can be reused
    """
    try:
        # Get the session log entry
        session_log = EpramaanSessionLog.objects.get(session_id=session_id)
        
        # Generate logout request ID
        logout_request_id = str(uuid.uuid4())
        
        # Generate HMAC
        hmac_value = generate_hmac_for_logout(session_id, logout_request_id)
        
        # Prepare logout data
        logout_data = {
            "clientId": "1000009XX",  # Replace with your actual client ID
            "sessionId": session_id,
            "hmac": hmac_value,
            "iss": "ePramaan",
            "logoutRequestId": logout_request_id,
            "sub": session_log.service_user_id,
            "redirectUrl": "http://10.184.43.25:5173/login",
            "customParameter": "logout_from_unified_dashboard"
        }
        
        # Convert to JSON string
        json_data = json.dumps(logout_data)
        
        # Prepare form data
        form_data = {
            'data': json_data
        }
        
        # Make POST request to e-Pramaan
        logout_url = "http://10.244.100.43:8080/openid/jwt/processOIDCSLORequest.do"
        
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        
        response = requests.post(
            logout_url,
            data=form_data,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            # Clear session log
            session_log.delete()
            
            return JsonResponse({
                "message": "Logout successful",
                "logout_request_id": logout_request_id,
                "redirect_url": logout_data["redirectUrl"]
            }, status=200)
        else:
            return JsonResponse({
                "error": f"Logout failed with status code: {response.status_code}",
                "response_text": response.text
            }, status=response.status_code)
            
    except EpramaanSessionLog.DoesNotExist:
        return JsonResponse({
            "error": "Session not found"
        }, status=404)
    except Exception as e:
        return JsonResponse({
            "error": f"Logout error: {str(e)}"
        }, status=500) 

def logout_api_with_model(request):
    """
    Logout API that gets session_id from EpramaanSessionLog model
    """
    try:
        # Get session_id from request (POST body, query param, or header)
        session_id = request.POST.get('session_id') or request.GET.get('session_id') or request.headers.get('X-Session-ID')
        
        if not session_id:
            return JsonResponse({"status": "error", "message": "session_id is required"}, status=400)
        
        # Get session from EpramaanSessionLog model
        try:
            session_log = EpramaanSessionLog.objects.get(session_id=session_id)
        except EpramaanSessionLog.DoesNotExist:
            return JsonResponse({"status": "error", "message": "Session not found in database"}, status=404)
        
        # ePramaan-specific logout setup
        logoutRequestId = uuid.uuid4().hex
        sessionId = session_log.session_id  # Get from model instead of hardcoded
        iss = "ePramaan"
        sub = session_log.service_user_id  # Get from model
        redirectUrl = "http://10.184.43.11:5173"  # Add your frontend URL here
        
        print("session======>", sessionId)
        print("sub======>", sub)
        
        inputValue = f"{client_id}{sessionId}{iss}{logoutRequestId}{sub}{redirectUrl}"
        hmac = hashHMAChex(logoutRequestId, inputValue)
        customParameter = ""
        
        epraaman_logout_url = "https://epstg.meripehchaan.gov.in/openid/jwt/processOIDCSLORequest.do"
        data = {
            "clientId": client_id,
            "sessionId": sessionId,
            "hmac": hmac,
            "iss": iss,
            "logoutRequestId": logoutRequestId,
            "sub": sub,
            "redirectUrl": redirectUrl,
            "customParameter": customParameter
        }
        print("data======>", data)
        
        # Clear the session log entry after successful logout preparation
        try:
            session_log.delete()
            print(f"Session log cleared for session_id: {sessionId}")
        except Exception as e:
            print(f"Error clearing session log: {e}")
        
        # Return JSON response with ePramaan logout URL and data
        return JsonResponse({
            "status": "success",
            "message": "Logged out successfully",
            "redirectionURL": epraaman_logout_url,
            "data": data,
            "session_id": sessionId,
            "user_info": {
                "name": session_log.name,
                "username": session_log.username,
                "service_user_id": session_log.service_user_id
            }
        })
        
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

def logout_api_by_username(request):
    """
    Alternative logout API that finds session by username
    """
    try:
        username = request.POST.get('username') or request.GET.get('username') or request.headers.get('X-Username')
        
        if not username:
            return JsonResponse({"status": "error", "message": "username is required"}, status=400)
        
        # Get session from EpramaanSessionLog model by username
        try:
            session_log = EpramaanSessionLog.objects.get(username=username)
        except EpramaanSessionLog.DoesNotExist:
            return JsonResponse({"status": "error", "message": "Session not found for this username"}, status=404)
        
        # ePramaan-specific logout setup
        logoutRequestId = uuid.uuid4().hex
        sessionId = session_log.session_id
        iss = "ePramaan"
        sub = session_log.service_user_id
        redirectUrl = "http://10.184.43.11:5173"
        
        print("session======>", sessionId)
        print("username======>", username)
        
        inputValue = f"{client_id}{sessionId}{iss}{logoutRequestId}{sub}{redirectUrl}"
        hmac = hashHMAChex(logoutRequestId, inputValue)
        customParameter = ""
        
        epraaman_logout_url = "https://epstg.meripehchaan.gov.in/openid/jwt/processOIDCSLORequest.do"
        data = {
            "clientId": client_id,
            "sessionId": sessionId,
            "hmac": hmac,
            "iss": iss,
            "logoutRequestId": logoutRequestId,
            "sub": sub,
            "redirectUrl": redirectUrl,
            "customParameter": customParameter
        }
        print("data======>", data)
        
        # Clear the session log entry
        try:
            session_log.delete()
            print(f"Session log cleared for username: {username}")
        except Exception as e:
            print(f"Error clearing session log: {e}")
        
        return JsonResponse({
            "status": "success",
            "message": "Logged out successfully",
            "redirectionURL": epraaman_logout_url,
            "data": data,
            "session_id": sessionId,
            "user_info": {
                "name": session_log.name,
                "username": session_log.username,
                "service_user_id": session_log.service_user_id
            }
        })
        
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500) 