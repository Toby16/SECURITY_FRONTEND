// src/pages/ghostroutevpn/howToUseContent.js
//
// Guides are keyed by protocol, then device: HOW_TO_USE_CONTENT[protocol][device].
// Leave a pair out and HowToUse.jsx automatically shows the "on the way" empty state,
// so the rest of the grid can be filled in later without touching the component.
//
// A guide can be either:
//   - a normal step-by-step guide (title, subtitle, prerequisites, links, steps, note)
//   - a redirect guide ({ redirect: true, title, subtitle, href, linkLabel }) for
//     platforms where we just point people at an official page instead of writing
//     our own walkthrough.

export const HOW_TO_USE_CONTENT = {
  wireguard: {
    android: {
      title: "WireGuard on Android",
      subtitle:
        "Install the official Wireguard app, then bring in your Ghostroute configuration to get connected.",
      prerequisites: [
        "An Android phone or tablet",
        "A WireGuard package purchased under our Ghostroute VPN protocols",
        "The official Wireguard Android app installed on your preferred android evice",
      ],
      links: [
        {
          label: "Get it on Google Play",
          href: "https://play.google.com/store/apps/details?id=com.wireguard.android",
          icon: "external",
        },
        {
          label: "Download apk directly",
          href: "https://download.wireguard.com/android-client/com.wireguard.android-1.0.20260315.apk",
          icon: "download",
        },
        {
          label: "Official install guide",
          href: "https://www.wireguard.com/install/#android-play-store-direct-apk-file",
          icon: "external",
        },
	{
	  label: "YouTube video Android guide",
	  href: "https://www.youtube.com/watch?v=sCapPAenO60&t=52s",
	  icon: "external",
	},
      ],
      stepsLabel: "connect with your Ghostroute configuration",
      steps: [
        {
          title: "Install the WireGuard app",
          text: "Use whichever link above suits you — Google Play if you'd rather it stay updated automatically, or the direct APK if you're sideloading. Open the app once it's installed.",
        },
        {
          title: "Get a WireGuard slot",
          text: "In Ghostroute VPN, open 'vpn protocols', choose WireGuard, pick a day range, and verify. Your slot appears under my vpns once verified successfully.",
        },
        {
          title: "Download your configuration file",
          text: "In 'my vpns', tap your newly verified WireGuard configuration, then tap download configuration file. It saves to your phone as a .conf file, usually in your Downloads folder.",
        },
        {
          title: "Import it into WireGuard app",
          text: "Back in the WireGuard app, tap the + in the bottom right corner, choose Import from file or archive, and select the .conf file you just downloaded. Give the tunnel any preferred name only if it asks for one.",
        },
        {
          title: "Turn the tunnel on",
          text: "Toggle the switch next to your new tunnel. Android will ask permission to set up a VPN connection the first time — allow it, and the toggle turns solid once connected.",
        },
        {
          title: "Confirm you're connected",
          text: "WireGuard shows the tunnel as connected, and your configuration in 'my vpns' switches to active with a live countdown. Open it any time to watch live upload and download.",
        },
      ],
      note: "Advice: always ensure to leave the Wireguard application running in background for best performance!",
    },
    ios: {
      title: "WireGuard on iOS",
      subtitle:
        "Install the official app from the App Store, then bring in your Ghostroute configuration to get connected.",
      prerequisites: [
        "An iPhone or iPad",
        "A WireGuard slot purchased under our Ghostroute VPN protocols",
        "The official WireGuard app installed from the App Store",
      ],
      links: [
        {
          label: "Get it on the App Store",
          href: "https://itunes.apple.com/us/app/wireguard/id1441195209?ls=1&mt=8",
          icon: "external",
        },
        {
          label: "Official install guide",
          href: "https://www.wireguard.com/install/#ios-app-store",
          icon: "external",
        },
	{
	  label: "YouTube video IOS guide",
	  href: "https://www.youtube.com/watch?v=FV70Rk6eClk",
	  icon: "external",
	},
      ],
      stepsLabel: "connect with your Ghostroute configuration",
      steps: [
        {
          title: "Install the WireGuard app",
          text: "Get the official WireGuard client from the App Store link above — it's the only supported source on iOS. Open the app once it's installed.",
        },
        {
          title: "Get a WireGuard slot",
          text: "In Ghostroute VPN, open 'vpn protocols', choose WireGuard, pick a day range, and verify. Your slot appears under my vpns once verified successfully.",
        },
        {
          title: "Download your configuration file",
          text: "In 'my vpns', tap your newly verified WireGuard configuration, then tap download configuration file. Save it somewhere you can reach from your device, like Files or iCloud Drive.",
        },
        {
          title: "Add the tunnel",
          text: "Open the WireGuard app, tap the + icon, and choose Create from file or archive. Select the .conf file you just downloaded. Give the tunnel any preferred name only if it asks for one.",
        },
        {
          title: "Authorize the VPN",
          text: "iOS will prompt you to allow WireGuard to add VPN configurations — tap Allow. This only happens the first time you add a tunnel.",
        },
        {
          title: "Confirm you're connected",
          text: "Toggle the switch next to your tunnel name. WireGuard shows it as connected, and your configuration in 'my vpns' switches to active with a live countdown.",
        },
      ],
      note: "Turn on auto-renew from the VPN detail view if you'd rather not track the days left yourself. Thanks!",
    },
    windows: {
      title: "WireGuard on Windows",
      subtitle:
        "Install the official desktop app, then bring in your Ghostroute configuration to get connected.",
      prerequisites: [
        "A Windows 10, 11, or Server 2016+ PC",
        "Administrator rights to install software",
        "A WireGuard slot purchased under our Ghostroute VPN protocols",
      ],
      links: [
        {
          label: "Download Windows installer",
          href: "https://download.wireguard.com/windows-client/wireguard-installer.exe",
          icon: "download",
        },
        {
          label: "Browse installers (MSI) - Advanced",
          href: "https://download.wireguard.com/windows-client/",
          icon: "external",
        },
        {
          label: "Official install guide",
          href: "https://www.wireguard.com/install/#windows-10-11-2016-2019-2022-2025",
          icon: "external",
        },
	{
	  label: "YouTube video Windows guide",
	  href: "https://www.youtube.com/watch?v=s6ZvtUpvyy8",
	  icon: "external",
	},
      ],
      stepsLabel: "connect with your Ghostroute configuration",
      steps: [
        {
          title: "Install the WireGuard app",
          text: "Run wireguard-installer.exe with administrator rights. It downloads, verifies, and installs the right build for your PC automatically, so you don't need to pick one of the individual MSI packages under 'browse installers' — that's only there for advanced or offline setups. Open WireGuard once it's installed.",
        },
        {
          title: "Get a WireGuard slot",
          text: "In Ghostroute VPN, open 'vpn protocols', choose WireGuard, pick a day range, and verify. Your slot appears under my vpns once verified successfully.",
        },
        {
          title: "Download your configuration file",
          text: "In 'my vpns', tap your newly verified WireGuard configuration, then tap download configuration file. It saves as a .conf file — Downloads or your Desktop both work fine.",
        },
        {
          title: "Import it into WireGuard app",
          text: "In the WireGuard app, click the arrow next to Add Tunnel and choose Import tunnel(s) from file, then select the .conf file you just downloaded. You can also just drag the file onto the app window.",
        },
        {
          title: "Activate the tunnel",
          text: "Select your imported tunnel from the list on the left and click Activate. Windows may ask you to allow WireGuard to make network changes — allow it.",
        },
        {
          title: "Confirm you're connected",
          text: "The tunnel status turns green with live traffic stats in the WireGuard app, and your configuration in 'my vpns' switches to active with a live data metrics.",
        },
      ],
      note: "Advice: using your configuration file actively on more than 1 device might result in a slower network!",
    },
    macos: {
      title: "WireGuard on MacOS",
      subtitle:
        "Install the official app from the Mac App Store, then bring in your Ghostroute configuration to get connected.",
      prerequisites: [
        "A Mac computer running a supported version of MacOS",
        "A WireGuard slot purchased under our Ghostroute VPN protocols",
        "The official WireGuard app installed from the Mac App Store",
      ],
      links: [
        {
          label: "Get it on the Mac App Store",
          href: "https://itunes.apple.com/us/app/wireguard/id1451685025?ls=1&mt=12",
          icon: "external",
        },
        {
          label: "Official install guide",
          href: "https://www.wireguard.com/install/#macos-app-store",
          icon: "external",
        },
	{
	  label: "YouTube video MacOS guide",
	  href: "https://www.youtube.com/watch?v=psTuEAzsLbE",
	  icon: "external",
	},
      ],
      stepsLabel: "connect with your Ghostroute configuration",
      steps: [
        {
          title: "Install the WireGuard app",
          text: "Get the official WireGuard client from the Mac App Store link provided. Open the app once it's installed — you'll find it in your menu bar from then on.",
        },
        {
          title: "Get a WireGuard slot",
          text: "In Ghostroute VPN, open 'vpn protocols', choose WireGuard, pick a day range, and verify. Your slot appears under 'my vpns' once verified successfully.",
        },
        {
          title: "Download your configuration file",
          text: "In 'my vpns', tap your newly verified WireGuard configuration, then tap download configuration file. It saves as a .conf file, usually to your Downloads folder.",
        },
        {
          title: "Import the tunnel",
          text: "From the WireGuard menu bar icon, choose Import tunnel(s) from file, then select the .conf file you just downloaded. Dragging the file onto the app's tunnel list works too.",
        },
        {
          title: "Activate the tunnel",
          text: "Click the WireGuard menu bar icon, select your imported tunnel, and toggle it on. macOS will ask you to confirm the new VPN configuration the first time — allow it.",
        },
        {
          title: "Confirm you're connected",
          text: "The menu bar icon fills in to show an active tunnel, and your configuration in 'my vpns' switches to active with a live data metrics.",
        },
      ],
      note: "Turn on auto-renew from the VPN detail view if you'd rather not track the days left yourself. Thanks!",
    },
    linux: {
      redirect: true,
      title: "WireGuard on Linux & other platforms",
      subtitle:
        "WireGuard ships natively or via package managers on most Linux distributions, like Ubuntu, Debian, Fedora, plus BSD, routers, and a few other platforms. Setup varies a lot by system, so we point you straight to WireGuard's own install page rather than guess your distro.",
      linkLabel: "Open official install guide",
      href: "https://www.wireguard.com/install/",
    },
  },
  openvpn: {
    android: {
      title: "OpenVPN on Android",
      subtitle:
        "Install the official OpenVPN Connect app, then import your Ghostroute profile to get connected.",
      prerequisites: [
        "An Android device running a supported version of Android",
        "An OpenVPN package purchased under our Ghostroute VPN protocols",
        "The official OpenVPN Connect app installed on your device",
      ],
      links: [
        {
          label: "Get it on Google Play",
          href: "https://play.google.com/store/apps/details?id=net.openvpn.openvpn",
          icon: "external",
        },
        {
          label: "Official install guide",
          href: "https://openvpn.net/connect-docs/android-installation-guide.html",
          icon: "external",
        },
	{
	  label: "YouTube video Android guide",
	  href: "https://www.youtube.com/watch?v=8HZMqmN-AqE&t=1s",
	  icon: "external",
	},
      ],
      stepsLabel: "connect with your Ghostroute configuration",
      steps: [
        {
          title: "Install OpenVPN Connect",
          text: "Get the official OpenVPN Connect app from Google Play. It's the only OpenVPN application supported on Android, so avoid third-party OpenVPN apps.",
        },
        {
          title: "Open the app and accept the data policy",
          text: "Launch OpenVPN Connect for the first time and review its data usage policy — you'll need to agree to it before the import screen appears.",
        },
        {
          title: "Get an OpenVPN package",
          text: "In Ghostroute VPN, open 'vpn protocols', choose OpenVPN, pick a convenient package, and verify. Your configuration file appears under 'my vpns' once verified successfully.",
        },
        {
          title: "Download your configuration file",
          text: "In 'my vpns', tap your newly verified OpenVPN configuration file, then tap download configuration file. It saves to your device as a .ovpn file, usually in your Downloads folder.",
        },
        {
          title: "Import the configuration file~",
          text: "Back in the OpenVPN Connect app, choose Import Profile, then File, and select the .ovpn file you just downloaded. You can import from a cloud service like Google Drive instead if that's easier to reach the file from.",
        },
        {
          title: "Connect and stay protected",
          text: "Select the imported configuration file and tap Connect. Android will ask permission to set up a VPN connection the first time — allow it, and the app's status shows active once the tunnel is up.",
        },
        {
          title: "Confirm you're connected",
          text: "OpenVPN Connect shows the configuration has connected with a running session timer, and your configuration in 'my vpns' switches to active. Open it any time to watch live uploads and downloads metrics.",
        },
      ],
      note: "Advice: always ensure to leave the OpenVPN Client application running in background for best performance!",
    },
    ios: {
      title: "OpenVPN on iOS",
      subtitle:
        "Install the official OpenVPN Connect app, then import your Ghostroute profile to get connected.",
      prerequisites: [
        "An iPhone or iPad running a supported version of iOS",
        "An OpenVPN package purchased under our Ghostroute VPN protocols",
        "The official OpenVPN Connect app installed from the App Store",
      ],
      links: [
        {
          label: "Get it on the App Store",
          href: "https://apps.apple.com/us/app/openvpn-connect/id590379981",
          icon: "external",
        },
        {
          label: "Official install guide",
          href: "https://openvpn.net/connect-docs/ios-installation-guide.html",
          icon: "external",
        },
	{
	  label: "YouTube video IOS guide",
	  href: "https://www.youtube.com/watch?v=DCJEOkdliP0",
	  icon: "external",
	},
      ],
      stepsLabel: "connect with your Ghostroute configuration",
      steps: [
        {
          title: "Install OpenVPN Connect",
          text: "Get the official OpenVPN Connect app from the App Store. It's the only OpenVPN application supported on iOS, so avoid third-party OpenVPN apps.",
        },
        {
          title: "Open the app and accept the data policy",
          text: "Launch OpenVPN Connect for the first time and tap Agree on its data usage policy — you'll need to accept it before the import screen appears.",
        },
        {
          title: "Get an OpenVPN package",
          text: "In Ghostroute VPN, open 'vpn protocols', choose OpenVPN, pick a convenient package, and verify. Your new vpn configuration appears under 'my vpns' once verified successfully.",
        },
        {
          title: "Download your configuration file",
          text: "In 'my vpns', tap your newly verified OpenVPN configuration, then tap download configuration file. It saves as a .ovpn file — Files or iCloud Drive are both easy to reach it from afterward.",
        },
        {
          title: "Import the configuration file",
          text: "Open the .ovpn file from Files (or wherever you saved it), tap the Share icon, and choose Copy to OpenVPN. Back in OpenVPN Connect, tap Add to finish importing the configuration file.",
        },
        {
          title: "Authorize the VPN",
          text: "Tap Add or Connect, then tap Allow when iOS asks to add a VPN configuration. Confirm with your device passcode if prompted.",
        },
        {
          title: "Connect and confirm",
          text: "Toggle the switch next to your imported configuration. OpenVPN Connect shows it has connected with a running session timer, and your configuration in 'my vpns' switches to active.",
        },
      ],
      note: "Advice: using your configuration file actively on more than 1 device might result in a slower network!",
    },
    windows: {
      title: "OpenVPN on Windows",
      subtitle:
        "Install the official OpenVPN Connect app, then import your Ghostroute profile to get connected.",
      prerequisites: [
        "A Windows 10 or 11 (64-bit) PC",
        "An OpenVPN package purchased under our Ghostroute VPN protocols",
        "The official OpenVPN Connect app installed on your PC",
      ],
      links: [
        {
          label: "Get it on the Microsoft Store",
          href: "https://apps.microsoft.com/detail/xpdlgw32hhrb5p?hl=en-us&gl=EN",
          icon: "external",
        },
        {
          label: "Official install guide",
          href: "https://openvpn.net/connect-docs/get-started-with-openvpn-connect-on-windows.html",
          icon: "external",
        },
	{
	  label: "YouTube video Windows guide",
	  href: "https://www.youtube.com/watch?v=Ntd21hdnPtw",
	  icon: "external",
	},
      ],
      stepsLabel: "connect with your Ghostroute configuration",
      steps: [
        {
          title: "Install OpenVPN Connect",
          text: "Get the official OpenVPN Connect app from the Microsoft Store link above and let it install. Open the app once it's done.",
        },
        {
          title: "Accept the data policy",
          text: "The first time OpenVPN Connect opens, review and agree to its data usage policy before continuing.",
        },
        {
          title: "Get an OpenVPN package",
          text: "In Ghostroute VPN, open 'vpn protocols', choose OpenVPN, pick a convenient package, and verify. Your new configuration file appears under 'my vpns' once verified successfully.",
        },
        {
          title: "Download your configuration file",
          text: "In 'my vpns', tap your newly verified OpenVPN configuration, then tap download configuration file. It saves as a .ovpn file — Downloads or your Desktop both work fine.",
        },
        {
          title: "Import the configuration file",
          text: "In OpenVPN Connect, select File under Import Profile and browse to the .ovpn file you just downloaded, then confirm the import.",
        },
        {
          title: "Connect",
          text: "Select the imported configuration file and click Connect. Windows may ask you to allow the app to make network changes — select Yes.",
        },
        {
          title: "Confirm you're connected",
          text: "OpenVPN Connect shows the configuration has connected with a running session timer, and your configuration in 'my vpns' switches to active. Open it any time to watch live upload and download.",
        },
      ],
      note: "Advice: always ensure to leave the OpenVPN Client application running in background for best performance!",
    },
    macos: {
      title: "OpenVPN on macOS",
      subtitle:
        "Install the official OpenVPN Connect app, then import your Ghostroute profile to get connected.",
      prerequisites: [
        "A Mac running a supported version of macOS",
        "An OpenVPN package purchased under our Ghostroute VPN protocols",
        "The official OpenVPN Connect app installed on your Mac",
      ],
      links: [
        {
          label: "Get OpenVPN Connect for macOS",
          href: "https://openvpn.net/client-connect-vpn-for-mac-os/",
          icon: "external",
        },
        {
          label: "Official install guide",
          href: "https://openvpn.net/connect-docs/macos-installation-guide.html",
          icon: "external",
        },
	{
	  label: "YouTube video MacOS guide",
	  href: "https://www.youtube.com/watch?v=46m_7CrkrzI",
	  icon: "external",
	},
      ],
      stepsLabel: "connect with your Ghostroute configuration",
      steps: [
        {
          title: "Install OpenVPN Connect",
          text: "Download OpenVPN Connect from the link above, open the .dmg file, and drag the app into your Applications folder. Open it from there once it's copied over.",
        },
        {
          title: "Accept the data policy",
          text: "The first time OpenVPN Connect opens, review and agree to its data usage policy before continuing.",
        },
        {
          title: "Get an OpenVPN package",
          text: "In Ghostroute VPN, open 'vpn protocols', choose OpenVPN, pick a convenient package, and verify. Your profile appears under 'my vpns' once verified successfully.",
        },
        {
          title: "Download your configuration file",
          text: "In 'my vpns', tap your newly verified OpenVPN configuration, then tap download configuration file. It saves as a .ovpn file, usually to your Downloads folder.",
        },
        {
          title: "Import the configuration file",
          text: "In OpenVPN Connect, choose the Upload File tab and select the .ovpn file you just downloaded, or just drag it straight onto the app window.",
        },
        {
          title: "Connect",
          text: "Select the imported configuration file and click Connect. macOS may ask you to allow the app to make changes to establish the connection — click Allow.",
        },
        {
          title: "Confirm you're connected",
          text: "OpenVPN Connect shows the configuration file has connected with a running session timer, and your configuration in 'my vpns' switches to active. Open it any time to watch live upload and download.",
        },
      ],
      note: "Turn on auto-renew from the VPN detail view if you'd rather not track your remaining usage yourself. Thanks!",
    },
    linux: {
      redirect: true,
      title: "OpenVPN on Linux & other platforms",
      subtitle:
        "OpenVPN 3 Linux is the official client for Ubuntu, Debian, Fedora, Red Hat Enterprise, and most other distributions, built on the same core library used by OpenVPN Connect and OpenVPN for Android. Setup varies a lot by system, so we point you straight to OpenVPN's own documentation rather than guess your distro.",
      linkLabel: "Open official OpenVPN 3 Linux guide",
      href: "https://openvpn.net/community-docs/openvpn-client-for-linux.html",
    },
  },
};
