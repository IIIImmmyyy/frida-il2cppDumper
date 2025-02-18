


# [Android U3D手游安全中级篇] 
# [https://github.com/IIIImmmyyy/u3dCourse](https://github.com/IIIImmmyyy/U3DGameCourse)




## --------------------------------------------------------------------


# frida-il2cppDumper

### Riru Il2cppDumper 加强版 内存里直接dump出源码信息
#### Riru 无法输出泛型的问题也修正了、 但由于引擎版本特性、部分class还是无法输出propertyInfo的信息、 无伤大雅;
#### 针对大部分global-metadata.dat 文件加密 il2cpp.so加密 可无视加密  基于主动调用、 所以就算是边运行边解密的壳也能成功解出
#### 对魔改了结构体的游戏也同时有效，除非丧心病狂全改了(目前没发现,大部分的魔改处理还是在GlobalMetadataHeader)
## 支持平台:
### Android IOS
## 支持Unity版本:
### 2017-最新
### 尽量不要在模拟器环境使用，由于模拟器使用X86架构， 如果游戏没有编译X86的SO frida是无法找到对应SO的，另外frida对于模拟器的兼容性也并非特别的完美。

## 易盾dump支持说明
>*  ```修改 export let isNetProtect=true ```
>* 由于易盾的特殊处理，有兼容问题 目前大概率仅支持2020、 2021 引擎 其他版本未测试 （其他版本未兼容、请提供APK 看心情处理 :smile:）;同时基于linker处理 仅测试在Android 12下的表现
>*  测试游戏 :  迷途之光 、阿瑞斯病毒2
>*  测试机型 OnePlus 7 Pro (Android 12 )
>*  如何修复易盾加固的So？ 请关注我的U3D课程。 易盾So修复提供全部的源码，并且全自动修复所有新版易盾So

## 如何使用
## 1.
#### > Android 修改_agent.js 下exports.pkg_name = "You game package";

#### > IOS 下修改SO 为UnityFramework 如果为其他命名请自行修改

## 2.
### 运行游戏 -->运行脚本-->文件生成在/data/data/游戏包名/dump.cs下

### 3.默认开启 Cpp2IL功能(仅支持安卓，IOS懒得写= =) 在/data/data/游戏包名/files/Script/下将生成各个对应的单cs类,打开任一版本Unity直接导入即可查看层级关系
<img alt ="u3d.ong" src="https://raw.githubusercontent.com/IIIImmmyyy/frida-il2cppDumper/main/1.png" >

### 4.CPP2IL 新增压缩生成的Script文件夹，以供快速导出 默认路径/data/data/游戏包名/files/Script.zip。不开启压缩关闭export let ZipOutCSFile=false; 默认true


## 感谢
[RiruIl2CppDumper ](https://github.com/Perfare/Riru-Il2CppDumper.git)


