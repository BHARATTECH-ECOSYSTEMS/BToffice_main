# BharatTech Chatwoot Initialization & SSO Setup Script
# Run via: docker exec -i chatwoot-rails-1 bundle exec rails runner - < setup_chatwoot.rb

puts "=== Initializing Chatwoot for BharatTech LMS SSO ==="

# 1. Clear any stuck onboarding flag from Redis
::Redis::Alfred.delete(::Redis::Alfred::CHATWOOT_INSTALLATION_ONBOARDING)
puts "[✔] Cleared Redis CHATWOOT_INSTALLATION_ONBOARDING flag"

# 2. Ensure Primary Account exists
account = Account.first || Account.create!(name: 'BharatTech')
puts "[✔] Primary Account: ##{account.id} (#{account.name})"

# 3. Ensure SuperAdmin exists
super_admin = SuperAdmin.find_by(email: 'admin@bharattech.local')
if super_admin.nil?
  # Check if regular user exists with this email
  user = User.find_by(email: 'admin@bharattech.local')
  if user
    user.update!(type: 'SuperAdmin')
    super_admin = SuperAdmin.find(user.id)
  else
    super_admin = SuperAdmin.create!(
      name: 'BharatTech Admin',
      email: 'admin@bharattech.local',
      password: 'BharatTechAdmin2026!'
    )
  end
end
puts "[✔] SuperAdmin: #{super_admin.email}"

# Ensure SuperAdmin is member of Account
AccountUser.find_or_create_by!(account: account, user: super_admin) do |au|
  au.role = :administrator
end
puts "[✔] SuperAdmin linked to Account"

# 4. Ensure Platform App exists with the configured token
app = PlatformApp.first || PlatformApp.create!(name: 'BharatTech LMS')
token = app.access_token || app.create_access_token
token.update!(token: ENV['CHATWOOT_PLATFORM_APP_TOKEN'] || '3E6Q8A5na18vNfTghx73fcr6')
puts "[✔] Platform App '#{app.name}' configured with token: #{token.token}"

# 5. Ensure Platform App is permissible on the primary Account
PlatformAppPermissible.find_or_create_by!(platform_app: app, permissible: account)
puts "[✔] Platform App permissible on Account ##{account.id}"

puts "=== Chatwoot Setup Complete! ==="
