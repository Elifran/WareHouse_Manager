from django.core.management.base import BaseCommand
from core.models import User


class Command(BaseCommand):
    help = 'List all users in the system'

    def handle(self, *args, **options):
        users = User.objects.all().order_by('username')
        
        if not users.exists():
            self.stdout.write(self.style.WARNING('No users found in the system'))
            return
        
        self.stdout.write(self.style.SUCCESS(f'Found {users.count()} users:'))
        self.stdout.write('-' * 80)
        
        for user in users:
            status = 'Active' if user.is_active else 'Inactive'
            superuser = ' (Superuser)' if user.is_superuser else ''
            self.stdout.write(
                f'Username: {user.username:<20} | '
                f'Email: {user.email:<25} | '
                f'Role: {user.role:<10} | '
                f'Status: {status}{superuser}'
            )
        
        self.stdout.write('-' * 80)
