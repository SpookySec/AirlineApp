from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = "Create a default admin account (username: admin, password: admin)"

    def handle(self, *args, **options):
        username = 'admin'
        password = 'admin'
        
        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f'User "{username}" already exists. Skipping creation.'))
            return
        
        user = User.objects.create_superuser(
            username=username,
            password=password,
            email='admin@airline.local',
            is_staff=True,
            is_superuser=True
        )
        
        self.stdout.write(self.style.SUCCESS(f'Successfully created admin account: {username}'))
