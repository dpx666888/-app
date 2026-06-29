// 存储权限检查：Android 动态申请，iOS 直接通过
export function checkStoragePermission() {
  return new Promise(function(resolve) {
    // 非 APP-PLUS 环境，无需存储权限
    if (typeof plus === 'undefined') {
      resolve(true);
      return;
    }

    try {
      // iOS 不需要存储权限
      if (plus.os.name === 'iOS') {
        resolve(true);
        return;
      }

      // Android：用原生 API 申请存储权限
      if (typeof plus.android === 'undefined') {
        resolve(true);
        return;
      }

      plus.android.requestPermissions(
        ['android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE'],
        function(result) {
          try {
            var granted = result.granted || [];
            var deniedAlways = result.deniedAlways || [];

            if (deniedAlways.length > 0) {
              console.error('[checkStoragePermission] 权限被永久拒绝');
              uni.showModal({
                title: '需要存储权限',
                content: '导出/导入文件需要存储权限，请在系统设置中手动授权。',
                confirmText: '去设置',
                success: function(modalRes) {
                  if (modalRes.confirm) {
                    try {
                      var main = plus.android.runtimeMainActivity();
                      var Intent = plus.android.importClass('android.content.Intent');
                      var Settings = plus.android.importClass('android.provider.Settings');
                      var Uri = plus.android.importClass('android.net.Uri');
                      var intent = new Intent(
                        Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                        Uri.parse('package:' + main.getPackageName())
                      );
                      main.startActivity(intent);
                    } catch (e) {
                      console.error('[checkStoragePermission] 跳转设置失败:', e.message || e);
                    }
                  }
                }
              });
              resolve(false);
            } else if (granted.length >= 2) {
              resolve(true);
            } else {
              console.error('[checkStoragePermission] 权限被部分拒绝');
              uni.showToast({ title: '需要存储权限才能导出文件', icon: 'none' });
              resolve(false);
            }
          } catch (e) {
            console.error('[checkStoragePermission] 处理权限结果异常:', e.message || e);
            resolve(false);
          }
        },
        function(e) {
          console.error('[checkStoragePermission] requestPermissions 失败:', e.message || e);
          uni.showToast({ title: '无法获取存储权限', icon: 'none' });
          resolve(false);
        }
      );
    } catch (e) {
      console.error('[checkStoragePermission] 异常:', e.message || e);
      resolve(true);
    }
  });
}
