cask "bharattech" do
  version "__VERSION__"
  sha256 "__SHA256__"

  url "__URL__"
  name "BharatTech"
  desc "Local-first cockpit for AI-assisted coding"
  homepage "https://github.com/BharatTech/bharattech"

  app "BharatTech.app"

  postflight do
    # Best-effort friction reduction for unsigned / unnotarized builds.
    system_command "/usr/bin/xattr",
      args: ["-dr", "com.apple.quarantine", "#{appdir}/BharatTech.app"]
  end

  zap trash: [
    "~/.agent-workspace",
  ]
end
