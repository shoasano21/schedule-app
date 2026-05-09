/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  icon: '../../assets/icon.png',
  colors: {
    $accent: '#0A84FF',
    $widgetBackground: '#FFFFFF',
  },
  entitlements: {
    'com.apple.security.application-groups': ['group.com.shoasano.scheduleapp'],
  },
  deploymentTarget: '17.0',
};
