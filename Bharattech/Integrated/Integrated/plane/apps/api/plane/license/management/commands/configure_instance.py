# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Python imports
import os

# Django imports
from django.core.management.base import BaseCommand, CommandError

# Module imports
from plane.license.models import InstanceConfiguration
from plane.utils.instance_config_variables import instance_config_variables


class Command(BaseCommand):
    help = "Configure instance variables"

    def add_arguments(self, parser):
        parser.add_argument(
            "--sync-env",
            action="store_true",
            help="Sync values from environment variables even if configuration already exists",
        )

    def handle(self, *args, **options):
        from plane.license.utils.encryption import encrypt_data

        sync_env = options.get("sync_env", False)
        mandatory_keys = ["SECRET_KEY"]

        for item in mandatory_keys:
            if not os.environ.get(item):
                raise CommandError(f"{item} env variable is required.")

        for item in instance_config_variables:
            obj, created = InstanceConfiguration.objects.get_or_create(key=item.get("key"))
            env_val = item.get("value")
            if created or sync_env or (env_val and not obj.value):
                obj.category = item.get("category")
                obj.is_encrypted = item.get("is_encrypted", False)
                if item.get("is_encrypted", False):
                    obj.value = encrypt_data(env_val)
                else:
                    obj.value = env_val
                obj.save()
                action = "loaded" if created else "updated"
                self.stdout.write(self.style.SUCCESS(f"{obj.key} {action} with value from environment variable."))
            else:
                self.stdout.write(self.style.WARNING(f"{obj.key} configuration already exists"))
