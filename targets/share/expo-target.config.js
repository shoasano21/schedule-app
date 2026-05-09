/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'share',
  icon: '../../assets/icon.png',
  entitlements: {
    'com.apple.security.application-groups': ['group.com.shoasano.scheduleapp'],
  },
  deploymentTarget: '17.0',
  // Apple は App Store 提出時に TRUEPREDICATE 形式の activation rule を拒否する。
  // URL と Text を明示的に指定したルールに上書き。
  infoPlist: {
    NSExtension: {
      NSExtensionAttributes: {
        NSExtensionActivationRule: {
          NSExtensionActivationSupportsWebURLWithMaxCount: 1,
          NSExtensionActivationSupportsText: true,
        },
      },
    },
  },
};
