export default {
  android: {
    files: [
      'android/app/build.gradle',
      // Support multiple Android modules
      // 'android/mylibrary/build.gradle',
    ],
  },
  ios: {
    files: [
      // Auto-detect all .xcodeproj files
      'ios/*.xcodeproj/project.pbxproj',
      // Or specify explicit paths
      // 'ios/MyApp.xcodeproj/project.pbxproj'
    ],
  },
  packageJson: 'package.json',
};
