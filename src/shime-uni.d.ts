/// <reference types="@dcloudio/types" />

declare module '*.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 扩展uni类型
declare namespace UniNamespace {
  interface Uni {
    $u: any
  }
}
