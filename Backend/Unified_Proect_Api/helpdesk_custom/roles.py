def get_user_role(user):
    if user.is_superuser or user.has_perm('helpdesk.helpdesk_staff'):
        return "admin"
    elif user.groups.filter(name="FLA").exists():
        return "fla"
    else:
        return "employee"
