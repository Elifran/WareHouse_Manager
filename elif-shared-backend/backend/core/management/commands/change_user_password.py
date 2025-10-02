from django.core.management.base import BaseCommand, CommandError
from core.models import User


class Command(BaseCommand):
    help = 'Change a user password'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Username to change password for')
        parser.add_argument('password', type=str, help='New password')

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']

        try:
            user = User.objects.get(username=username)
            user.set_password(password)
            user.save()
            self.stdout.write(
                self.style.SUCCESS(f'Successfully changed password for user "{username}"')
            )
        except User.DoesNotExist:
            raise CommandError(f'User "{username}" does not exist')
        except Exception as e:
            raise CommandError(f'Error changing password: {e}')
