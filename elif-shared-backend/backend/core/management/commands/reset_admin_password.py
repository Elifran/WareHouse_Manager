from django.core.management.base import BaseCommand
from core.models import User


class Command(BaseCommand):
    help = 'Reset admin user password'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            default='admin',
            help='Username to reset password for (default: admin)'
        )
        parser.add_argument(
            '--password',
            type=str,
            default='admin123',
            help='New password (default: admin123)'
        )

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']
        
        try:
            user = User.objects.get(username=username)
            user.set_password(password)
            user.save()
            self.stdout.write(
                self.style.SUCCESS(f'Successfully reset password for user "{username}"')
            )
            self.stdout.write(f'New password: {password}')
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User "{username}" does not exist')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error resetting password: {str(e)}')
            )
