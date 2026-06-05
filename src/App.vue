<script lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useUserStore } from './stores/user'

export default {
  onLaunch() {
    console.log('App Launch')
    
    // 检查登录状态
    const userStore = useUserStore()
    if (userStore.isLoggedIn) {
      userStore.fetchUserInfo()
    }
  },
  onShow() {
    console.log('App Show')
  },
  onHide() {
    console.log('App Hide')
  },
}
</script>

<style lang="scss">
/* uView 基础样式 - 必须按顺序导入 */
@import 'uview-plus/theme.scss';
@import 'uview-plus/libs/css/mixin.scss';
@import 'uview-plus/libs/css/common.scss';

/* 全局样式 */
page {
  background-color: #f8f8f8;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 通用样式 */
.container {
  padding: 20rpx 30rpx;
}

.text-center {
  text-align: center;
}

.text-primary {
  color: #5677fc;
}

.text-success {
  color: #19be6b;
}

.text-warning {
  color: #ff9900;
}

.text-error {
  color: #fa3534;
}

.text-muted {
  color: #999;
}

.flex {
  display: flex;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.flex-1 {
  flex: 1;
}

.mt-20 {
  margin-top: 20rpx;
}

.mb-20 {
  margin-bottom: 20rpx;
}

.p-20 {
  padding: 20rpx;
}

.bg-white {
  background-color: #fff;
}

.rounded {
  border-radius: 16rpx;
}

.shadow {
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}
</style>
