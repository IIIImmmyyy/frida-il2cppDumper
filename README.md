
# 本人已开U3D 课程 本项目将隐藏

## [Android U3D手游安全中级篇] https://github.com/IIIImmmyyy/u3dCourse




## --------------------------------------------------------------------


# frida-il2cppDumper

### Riru Il2cppDumper 加强版 内存里直接dump出源码信息
#### Riru 无法输出泛型的问题也修正了、 但由于引擎版本特性、部分class还是无法输出propertyInfo的信息、 无伤大雅;
#### 针对大部分global-metadata.dat 文件加密 il2cpp.so加密 可无视加密  基于主动调用、 所以就算是边运行边解密的壳也能成功解出
#### 对魔改了结构体的游戏也同时有效，除非丧心病狂全改了(目前没发现,大部分的魔改处理还是在GlobalMetadataHeader)
## 支持Unity版本:
### 2017-2021  （仅测试过2017和2018引擎，理论支持至最新）


### 本项目基于Node.js环境 请预先配置

### 尽量不要在模拟器环境使用，由于模拟器使用X86架构， 如果游戏没有编译X86的SO frida是无法找到对应SO的，另外frida对于模拟器的兼容性也并非特别的完美。

## 如何使用
## 1.
> 需要在config.ts 里修改以下参数



> export  const pkg_name="com.imy.test";

> export const UNITY_VER = UnityVer.V_2018_4_36f1; //不确定什么引擎就使用2018

### node.js 环境 命令 npm run watch 使修改文件生效。

### 如果闲编译麻烦直接下载_agent.js 并修改以上参数
## 2.
### 运行游戏 -->运行脚本-->文件生成在/data/data/游戏包名/dump.cs下


### 如果不知道游戏引擎的版本 就修改为2018的版本， 2017引擎较为特殊 需要在IDA中手动查找FromTypeDefinition
### 不知如何寻找请点击以下链接教程
[如何寻找FromTypeDefinition ](https://www.jianshu.com/p/06b518225e15)




## 感谢
[RiruIl2CppDumper ](https://github.com/Perfare/Riru-Il2CppDumper.git)


