export function handleError(err, title) {
  const msg = (err && err.message) || err || '未知错误';
  console.error(`[${title || 'Error'}]`, msg);
  uni.showToast({ title: msg, icon: 'none', duration: 2000 });
  return { success: false, message: msg };
}

export function wrapResult(success, message, data) {
  return { success, message, data };
}
