from rest_framework import permissions

class IsManagerOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow managers and admins to access certain views.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Allow access if user is admin or manager
        return request.user.role in ['admin', 'manager']
