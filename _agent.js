(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZipUtils = void 0;
exports.ZipUtils = {
    test: function () {
        this.zipFolder("/data/data/com.tencent.ro/files/Script", "/data/data/com.tencent.ro/files/Script.zip");
    },
    zipFolder: function (folderPath, outputPath, callback) {
        return Java.perform(function () {
            var Thread = Java.use('java.lang.Thread');
            var Runnable = Java.registerClass({
                // 实现Runnable接口
                name: 'com.example.ZipRunnable',
                implements: [Java.use('java.lang.Runnable')],
                methods: {
                    run: function () {
                        var FileOutputStream = Java.use('java.io.FileOutputStream');
                        var ZipOutputStream = Java.use('java.util.zip.ZipOutputStream');
                        var ZipEntry = Java.use('java.util.zip.ZipEntry');
                        var FileInputStream = Java.use('java.io.FileInputStream');
                        var File = Java.use('java.io.File');
                        var totalFiles = 0;
                        var processedFiles = 0;
                        var fos = FileOutputStream.$new(outputPath);
                        var zos = ZipOutputStream.$new(fos);
                        function countFiles(file) {
                            if (file.isDirectory()) {
                                var files = file.listFiles();
                                for (var i = 0; i < files.length; i++) {
                                    countFiles(files[i]);
                                }
                            }
                            else {
                                totalFiles++;
                            }
                        }
                        function addFileToZip(file, parentDir) {
                            if (file.isDirectory()) {
                                var files = file.listFiles();
                                for (var i = 0; i < files.length; i++) {
                                    addFileToZip(files[i], parentDir + file.getName() + "/");
                                }
                            }
                            else {
                                var entryName = parentDir + file.getName();
                                var entry = ZipEntry.$new(entryName);
                                zos.putNextEntry(entry);
                                var fis = FileInputStream.$new(file.getAbsolutePath());
                                var buffer = Java.array('byte', Array(1024).fill(0));
                                var length;
                                while ((length = fis.read(buffer)) != -1) {
                                    zos.write(buffer, 0, length);
                                }
                                fis.close();
                                zos.closeEntry();
                                processedFiles++;
                                console.log("Doing Cpp2IL files Zip one Folder Progress: " + (processedFiles / totalFiles * 100).toFixed(2) + "%");
                            }
                        }
                        var folder = File.$new(folderPath);
                        if (!folder.isDirectory()) {
                            throw new Error('Provided path is not a directory');
                        }
                        countFiles(folder);
                        addFileToZip(folder, "");
                        zos.close();
                        fos.close();
                        // 如果没有错误发生，调用回调函数并指示成功
                        Java.scheduleOnMainThread(function () {
                            callback(true);
                        });
                    }
                }
            });
            var thread = Thread.$new(Runnable.$new());
            thread.start();
        });
    }
};
},{}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoName = void 0;
exports.SoName = "libil2cpp.so";
},{}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSoInfo = exports.CSFileDir = exports.ZipOutCSFile = exports.OutCSFile = exports.DUMP_FILE_PATH = exports.path = exports.soName = exports.IOSDumpName = exports.UNITY_VER = exports.UnityVer = exports.pkg_name = void 0;
exports.pkg_name = "com.xqc.sdklink";
exports.UnityVer = {
    V_2017_4_31f1: "2017.4.31f1",
    V_2018_4_36f1: "2018.4.36f1",
    V_2020: "2020",
};
exports.UNITY_VER = exports.UnityVer.V_2018_4_36f1;
exports.IOSDumpName = "UnityFramework";
exports.soName = "libil2cpp.so";
exports.path = "/data/data/" + exports.pkg_name;
exports.DUMP_FILE_PATH = exports.path + "/dump.cs";
exports.OutCSFile = true;
exports.ZipOutCSFile = true;
exports.CSFileDir = "/data/data/" + exports.pkg_name + "/files/Script";
exports.useSoInfo = false;
},{}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dumper = void 0;
const dumpconfig_1 = require("./dumpconfig");
const il2cppApi_1 = require("./il2cpp/il2cppApi");
const logger_1 = require("./logger");
const CSFileOut_1 = require("./il2cpp/CSFileOut");
const tabledefs_1 = require("./il2cpp/tabledefs");
const Il2CppTypeEnum_1 = require("./il2cpp/Il2CppTypeEnum");
const utils_1 = require("./il2cpp/struct/utils");
const IOSUtils_1 = require("./ios/IOSUtils");
const ZipUtils_1 = require("./and/ZipUtils");
let classAllCount = 0;
console.log("platform:" + Process.platform);
let file = undefined;
let il2cpp_got = false;
let once = false;
let klassMap = new Map();
exports.dumper = {
    waitInject: function () {
        (0, logger_1.log)("waitInject");
        let open = Module.findExportByName(null, "open");
        //fopen替换
        (0, logger_1.log)("等待Il2cpp:" + open);
        if (open != null) {
            Interceptor.attach(open, {
                onEnter: function (args) {
                    let path = args[0].readCString();
                    // log("path:" + path);
                    if (path.indexOf(dumpconfig_1.soName) !== -1) {
                        this.hook = true;
                    }
                },
                onLeave: function (retval) {
                    // log("this.hook:" + this.hook);
                    if (this.hook) {
                        il2cpp_got = true;
                        // Interceptor.detachAll();
                        exports.dumper.start();
                    }
                }
            });
        }
    },
    start: function () {
        if (Process.platform === "darwin") {
            dumpconfig_1.soName = dumpconfig_1.IOSDumpName;
        }
        let module = Process.findModuleByName(dumpconfig_1.soName);
        (0, logger_1.log)("module:" + module);
        if (module == null) {
            setTimeout(function () {
                //执行
                exports.dumper.start();
            }, 3000);
            return;
        }
        //延迟一下
        (0, logger_1.log)("module " + module.path + " addr " + module.base);
        setTimeout(function () {
            if (once) {
                return;
            }
            once = true;
            module = Process.findModuleByName(dumpconfig_1.soName);
            let baseAddress = module.base;
            (0, logger_1.log)("base address:" + baseAddress);
            let domain = il2cppApi_1.il2cppApi.il2cpp_domain_get();
            il2cppApi_1.il2cppApi.il2cpp_thread_attach(domain);
            let size_t = Memory.alloc(Process.pointerSize);
            (0, logger_1.log)("domain:" + domain + " baseAddress:" + baseAddress);
            //可能还没加载
            let assemblies = il2cppApi_1.il2cppApi.il2cpp_domain_get_assemblies(domain, size_t);
            let assemblies_count = size_t.readInt();
            (0, logger_1.log)("assemblies_count:" + assemblies_count + " pointerSize:" + Process.pointerSize
                + " assemblies:" + assemblies);
            if (assemblies_count === 0) {
                setTimeout(function () {
                    this.start();
                }, 2000);
                return;
            }
            let il2CppImageArray = new Array();
            for (let i = 0; i < assemblies_count; i++) {
                let assembly = assemblies.add(Process.pointerSize * i).readPointer();
                let Il2CppImage = il2cppApi_1.il2cppApi.il2cpp_assembly_get_image(assembly);
                let typeStart = Il2CppImage.typeStart();
                (0, logger_1.log)("typeStart:" + typeStart + " name:" + Il2CppImage.nameNoExt() + " typeCount:" + Il2CppImage.typeCount());
                let isInterpreterImage = Il2CppImage.IsInterpreterImage();
                if (!isInterpreterImage) {
                    exports.dumper.out(" // Image :" + i + " " + Il2CppImage.nameNoExt() + " - " + Il2CppImage.typeStart() + "\n");
                }
                else {
                    exports.dumper.out(" // Image :" + i + " " + Il2CppImage.nameNoExt() + " - " + Il2CppImage.typeStart() + "---> HybridCLR Dll\n");
                }
                il2CppImageArray.push(Il2CppImage);
            }
            for (let i = 0; i < il2CppImageArray.length; i++) {
                (0, logger_1.log)("process: " + (i + 1) + "/" + assemblies_count);
                let Il2CppImage = il2CppImageArray[i];
                let nameNoExt = Il2CppImage.nameNoExt();
                let start = Il2CppImage.typeStart();
                let class_count = Il2CppImage.typeCount();
                // log("name:"+nameNoExt +" start:"+start +" count:"+class_count)
                // if (nameNoExt === "Assembly-CSharp") {
                // // dll
                // this.out("\n//assembly Image -->:" + nameNoExt + "    startIndex:" + start + "   typeCount:" + class_count);
                exports.dumper.findAllClass(Il2CppImage);
                // }
            }
            (0, logger_1.log)("dump end");
            (0, logger_1.log)("classAllCount:" + classAllCount);
            // log("nativeFunNotExistMap:" + il2cppApi.nativeFunNotExistMap.size);
            // if (il2cppApi.nativeFunNotExistMap.size > 0) {
            //     // log("some NativeFun is un exist ,parser will be not accurate :");
            //     il2cppApi.nativeFunNotExistMap.forEach(function (value, key) {
            //         log(key + "");
            //     })
            // }
            if (dumpconfig_1.OutCSFile && Process.platform === "linux") {
                let index = 0;
                klassMap.forEach(function (value, key) {
                    (0, logger_1.log)("process cs class " + index + "/" + klassMap.size);
                    index++;
                    CSFileOut_1.CSFileOut.outClass(key, value);
                });
                (0, logger_1.log)("out CSFile success");
                // log("create cs file " + il2CppClass.name());
                // CSFileOut.outClass(il2CppClass, csStr);
                // csStr="";
            }
            (0, logger_1.log)("all work is done");
            if (Process.platform === "darwin") {
                (0, logger_1.log)("this is in IOS platform  out path is in " + IOSUtils_1.IOSUtils.getDocumentDir() + "/dump.cs");
            }
            else {
                if (dumpconfig_1.OutCSFile && Process.platform === "linux") {
                    if (dumpconfig_1.ZipOutCSFile) {
                        ZipUtils_1.ZipUtils.zipFolder(dumpconfig_1.CSFileDir, dumpconfig_1.CSFileDir + ".zip", function (ok) {
                            if (ok) {
                                // log("zip success");
                                (0, logger_1.log)("this is in Android platform  out path is in " + dumpconfig_1.DUMP_FILE_PATH);
                                (0, logger_1.log)("Cpp2IL Zip Done Path:" + dumpconfig_1.CSFileDir + ".zip");
                            }
                            else {
                                (0, logger_1.log)("zip error");
                            }
                        });
                    }
                    else {
                        (0, logger_1.log)("Cpp2IL Zip Done Path:" + dumpconfig_1.CSFileDir);
                    }
                }
                else {
                    (0, logger_1.log)("this is in Android platform  out path is in " + dumpconfig_1.DUMP_FILE_PATH);
                }
            }
        }, 15000);
    },
    findAllClass: function (il2cppImage) {
        let class_count = il2cppImage.typeCount();
        (0, logger_1.log)("findAllClass " + il2cppImage.name() + "  class_count:" + class_count);
        for (let i = 0; i < class_count; i++) {
            (0, logger_1.log)("class process:" + (i + 1) + "/" + class_count + " in " + il2cppImage.name());
            let il2CppClass = il2cppImage.getClass(i);
            let il2CppType = il2CppClass.getType();
            let declaringType = il2CppClass.getDeclaringType();
            if (!declaringType.isNull()) {
                // log("declaringType:" + declaringType.name() + " class:" + il2CppClass.name());
            }
            let csStr = this.dumpClass(il2CppType);
            this.out(csStr);
            klassMap.set(il2CppClass, csStr);
        }
    },
    sleep: function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    dumpClass: function (il2CppType) {
        let csStr = "";
        let s = this.dumpType(il2CppType, csStr);
        return s;
    },
    parserType: function (il2CppType) {
        let il2cppTypeGetType = il2cppApi_1.il2cppApi.il2cpp_type_get_type(il2CppType);
        switch (il2cppTypeGetType) {
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_VOID:
                return "void";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_BOOLEAN:
                return "bool";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_CHAR:
                return "char";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_I1:
                return "short";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_U1:
                return "ushort";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_I2:
                return "Int16";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_U2:
                return "UInt16";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_I4:
                return "int";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_U4:
                return "uint";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_I8:
                return "Int64";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_U8:
                return "UInt64";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_R4:
                return "float";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_R8:
                return "double";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_STRING:
                return "string";
        }
        let il2CppClass = il2cppApi_1.il2cppApi.il2cpp_class_from_type(il2CppType);
        return il2CppClass.getGenericName();
    },
    dumpType: function (il2CppType, csStr) {
        let klass = il2cppApi_1.il2cppApi.il2cpp_class_from_type(il2CppType);
        let il2CppImage = il2cppApi_1.il2cppApi.il2cpp_class_get_image(klass);
        csStr += "\n//Namespace：" + klass.namespaze() + "  Image->" + il2CppImage.name() + "\n";
        let flags = klass.flags();
        let Serializable = flags & tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_SERIALIZABLE;
        if (Serializable) {
            csStr += '[Serializable]\n';
        }
        let visibility = flags & tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_VISIBILITY_MASK;
        switch (visibility) {
            case tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_PUBLIC:
            case tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_NESTED_PUBLIC:
                csStr += "public ";
                break;
            case tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_NOT_PUBLIC:
            case tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_NESTED_FAM_AND_ASSEM:
            case tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_NESTED_ASSEMBLY:
                csStr += "internal ";
                break;
            case tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_NESTED_PRIVATE:
                csStr += "private ";
                break;
            case tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_NESTED_FAMILY:
                csStr += "protected ";
                break;
            case tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_NESTED_FAM_OR_ASSEM:
                csStr += "protected internal ";
                break;
        }
        let isValuetype = klass.valueType();
        let IsEnum = klass.enumType();
        if (flags & tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_ABSTRACT && flags & tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_SEALED) {
            csStr += "static ";
        }
        else if (!(flags & tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_INTERFACE) && flags & tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_ABSTRACT) {
            csStr += "abstract ";
        }
        else if (!isValuetype && !IsEnum && flags & tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_SEALED) {
            csStr += "sealed ";
        }
        if (flags & tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_INTERFACE) {
            csStr += "interface ";
        }
        else if (IsEnum) {
            csStr += "enum ";
        }
        else if (isValuetype) {
            csStr += "struct ";
        }
        else {
            csStr += "class ";
        }
        let name = klass.name();
        //获取泛型
        if (name.indexOf("`") !== -1) {
            let split = name.split("`");
            name = split[0];
            name = name + klass.getGenericName();
        }
        csStr += name + " ";
        let klass_parent = klass.parent();
        let hasParent = false;
        if (!isValuetype && !IsEnum && !klass_parent.isNull()) {
            let parent_cls_type = klass_parent.getType();
            let typeEnum = parent_cls_type.getTypeEnum();
            if (typeEnum === Il2CppTypeEnum_1.Il2CppTypeEnum.IL2CPP_TYPE_OBJECT) {
                //not out
            }
            else {
                hasParent = true;
                csStr += ": " + klass_parent.name();
            }
        }
        //实现接口类
        let iter = Memory.alloc(Process.pointerSize);
        let interfaces;
        while (!(interfaces = klass.getInterfaces(iter)).isNull()) {
            let interfaces_name = interfaces.name();
            if (interfaces_name.indexOf("`") !== -1) {
                let split = interfaces_name.split("`");
                interfaces_name = split[0];
                interfaces_name = interfaces_name + interfaces.getGenericName();
            }
            if (!hasParent) {
                csStr += ": " + interfaces_name;
                hasParent = true;
            }
            else {
                csStr += ", " + interfaces_name;
            }
        }
        csStr += "\n{\n";
        csStr += this.dumpFiled(klass);
        csStr += this.dumpPropertyInfo(klass);
        csStr += this.dumpMethod(klass);
        csStr += "\n}";
        return csStr;
    },
    methodNeedReturnValue: function (returnType) {
        let il2cppTypeGetType = il2cppApi_1.il2cppApi.il2cpp_type_get_type(returnType);
        switch (il2cppTypeGetType) {
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_VOID:
                return "";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_BOOLEAN:
                return "return false;";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_CHAR:
                return "return '\0';";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_I1:
                return "return 0;";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_U1:
                return "return 0;";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_I2:
                return "return 0;";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_U2:
                return "return 0;";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_I4:
                return "return 0;";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_U4:
                return "return 0;";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_I8:
                return "return 0;";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_U8:
                return "return 0;";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_R4:
                return "return 0;";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_R8:
                return "return 0;";
            case tabledefs_1.Tabledefs.IL2CPP_TYPE_STRING:
                return "return null;";
            default:
                return "return null;";
        }
    },
    dumpMethod: function (klass) {
        let out = "";
        let iter = Memory.alloc(Process.pointerSize);
        let methodInfo;
        let isFirst = true;
        let baseAddr = Module.findBaseAddress(dumpconfig_1.soName);
        while (!(methodInfo = klass.getMethods(iter)).isNull()) {
            if (isFirst) {
                out += "\n\t//methods\n";
                isFirst = false;
            }
            let methodPointer = methodInfo.getMethodPointer();
            let generic = methodInfo.is_generic();
            let inflated = methodInfo.is_inflated();
            // log("generic:"+generic +" inflated:"+inflated +"name:"+methodInfo.name());
            if (!methodPointer.isNull()) {
                let number = methodPointer - baseAddr;
                if (number === 0x4CC8B94) {
                    let nativePointer = klass.add(16).readPointer();
                    logHHex(nativePointer);
                    (0, logger_1.log)("class :" + klass.name() + "length:" + klass.name().length);
                }
                out += "\t// RVA: 0x" + number.toString(16).toUpperCase();
                out += "  VA: 0x";
                out += methodPointer.toString(16).toUpperCase();
            }
            else {
                out += "\t// RVA: 0x  VA: 0x0";
            }
            //非必须
            // log("slot:" + methodInfo.getSlot());
            // if (methodInfo.getSlot() !== 65535) {
            //     this.out(" Slot: " + methodInfo.getSlot());
            // }
            out += "\n\t";
            let methodModifier = utils_1.utils.get_method_modifier(methodInfo.getFlags());
            out += methodModifier;
            let returnType = methodInfo.getReturnType();
            let return_cls = il2cppApi_1.il2cppApi.il2cpp_class_from_type(returnType);
            let methodName = methodInfo.name().replaceAll(".", "_").replaceAll("<", "_").replaceAll(">", "_");
            out += exports.dumper.parserType(returnType) + " " + methodName + "(";
            let paramCount = methodInfo.getParamCount();
            // log("paramCount:" + paramCount);
            if (paramCount > 0) {
                for (let i = 0; i < paramCount; i++) {
                    let paramType = methodInfo.getParam(i);
                    let paramCls = il2cppApi_1.il2cppApi.il2cpp_class_from_type(paramType);
                    let name = paramCls.name();
                    //获取泛型
                    if (name.indexOf("`") !== -1) {
                        let split = name.split("`");
                        name = split[0];
                        name = name + paramCls.getGenericName();
                    }
                    else {
                        name = exports.dumper.parserType(paramType);
                    }
                    out += name + " " + methodInfo.getParamName(i);
                    if (i + 1 !== paramCount) {
                        out += ", ";
                    }
                    else {
                        out += ") { " + this.methodNeedReturnValue(returnType) + " }\n";
                    }
                }
            }
            else {
                out += "){ " + this.methodNeedReturnValue(returnType) + " }\n";
            }
        }
        return out;
    },
    dumpPropertyInfo: function (klass) {
        let out = "";
        let iter = Memory.alloc(Process.pointerSize);
        let propertyInfo;
        let isFirst = true;
        while (!(propertyInfo = klass.getProperties(iter)).isNull()) {
            if (isFirst) {
                out += "\n\t// Properties\n";
                isFirst = false;
            }
            out += "\t";
            //获取getSet
            // log(" dumpPropertyInfo get:" + propertyInfo.getMethod().isNull());
            let pro_class;
            let method = propertyInfo.getMethod();
            let setMethod = propertyInfo.setMethod();
            if (method.isNull() && setMethod.isNull()) {
                let name = propertyInfo.getName();
                if (name !== "") {
                    out += "// unknow property:" + name + "\n";
                }
                continue;
            }
            if (!method.isNull()) {
                if (klass.name() === "JSONNode"
                    || klass.name() === "LCRole") {
                    continue;
                }
                let methodModifier = utils_1.utils.get_method_modifier(method.getFlags());
                // let methodPointer = method.getMethodPointer()
                // log("methodModifier:" + methodModifier + " methodPointer:" + methodPointer);
                out += methodModifier;
                try {
                    pro_class = il2cppApi_1.il2cppApi.il2cpp_class_from_type(method.getReturnType());
                }
                catch (e) {
                    pro_class = null;
                }
            }
            else if (!setMethod.isNull()) {
                let setModifier = utils_1.utils.get_method_modifier(setMethod.getFlags());
                out += setModifier;
                pro_class = il2cppApi_1.il2cppApi.il2cpp_class_from_type(setMethod.getReturnType());
            }
            if (pro_class === null) {
                out += "// unknow type : " + method.name();
                (0, logger_1.log)("unknow type: " + klass.name());
            }
            else {
                out += exports.dumper.parserType(pro_class.getType()) + " " + propertyInfo.getName() + " { ";
                if (!method.isNull()) {
                    out += "get; ";
                }
                if (!setMethod.isNull()) {
                    out += "set; ";
                }
                out += "}\n";
            }
            // log("pro_class:"+pro_class +"propertyInfo:"+propertyInfo.getName() +" method:"+method +" setMethod:"+setMethod)
        }
        return out;
    },
    dumpFiled: function (klass) {
        let out = "";
        // log("dumpFiled class :" + klass.name())
        let filedCount = klass.filedCount();
        // log("fieldCount:" + filedCount);
        let enumType = klass.enumType();
        if (filedCount > 0) {
            let iter = Memory.alloc(Process.pointerSize);
            let filedInfo;
            out += "\t//Fileds\n";
            while (!(filedInfo = klass.getFieldsInfo(iter)).isNull()) {
                let flags = filedInfo.getFlags();
                out += "\t";
                let access = flags & tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_FIELD_ACCESS_MASK;
                switch (access) {
                    case tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_PRIVATE:
                        out += "private ";
                        break;
                    case tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_PUBLIC:
                        if (!enumType) {
                            out += "public ";
                        }
                        break;
                    case tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_FAMILY:
                        out += "protected ";
                        break;
                    case tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_ASSEMBLY:
                    case tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_FAM_AND_ASSEM:
                        out += "internal ";
                        break;
                    case tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_FAM_OR_ASSEM:
                        out += "protected internal ";
                        break;
                }
                let isConst = false;
                if (flags & tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_LITERAL) {
                    if (!enumType) {
                        out += "const ";
                        isConst = true;
                    }
                }
                else {
                    if (flags & tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_STATIC) {
                        out += "static ";
                    }
                    if (flags & tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_INIT_ONLY) {
                        out += "readonly ";
                    }
                }
                let fieldClass = filedInfo.getFiledClass();
                let name = fieldClass.name(); //参数名
                let offset = filedInfo.getOffset(); //偏移
                // //如果是泛型变量则进行补充
                if (name.indexOf("`") !== -1) { //`1 `2 `3 说明是泛型类型 解析泛型变量
                    let genericName = fieldClass.getGenericName();
                    let split = name.split("`");
                    name = split[0];
                    name = name + genericName;
                }
                else {
                    name = exports.dumper.parserType(filedInfo.getType());
                }
                if (enumType && name === "int" && filedInfo.getFiledName().includes("value__")) {
                    //ignore this default enum value
                    continue;
                }
                else {
                    if (enumType) {
                        out += filedInfo.getFiledName();
                    }
                    else {
                        out += name + " " + filedInfo.getFiledName();
                    }
                }
                //获取常量的初始值
                // let filed_info_cpp_type = filedInfo.getType(); //获取变量参数类型
                // log("filed_info_cpp_type:" + filed_info_cpp_type.getTypeEnum() + name + " " + filedInfo.getFiledName());
                if (flags & tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_LITERAL) {
                    let staticValue = filedInfo.getStaticValue();
                    if (staticValue !== null) {
                        out += " = " + staticValue;
                    }
                    if (enumType) {
                        out += ",\n";
                    }
                    else {
                        out += ";\n";
                    }
                }
                else if (isConst) {
                    let staticValue = filedInfo.getStaticValue();
                    if (staticValue !== null) {
                        out += " = " + staticValue;
                    }
                    out += ";\n";
                }
                else {
                    out += " ;// 0x" + offset.toString(16).toUpperCase() + "\n";
                }
            }
        }
        return out;
    },
    out: function (string) {
        if (file === undefined) {
            if (Process.platform === "darwin") {
                let documentDir = IOSUtils_1.IOSUtils.getDocumentDir();
                file = new File(documentDir + "/dump.cs", "wb");
            }
            else {
                (0, logger_1.log)("android dump path " + dumpconfig_1.DUMP_FILE_PATH);
                file = new File(dumpconfig_1.DUMP_FILE_PATH, "wb");
            }
        }
        file.write(string);
        file.flush();
    }
};
},{"./and/ZipUtils":1,"./dumpconfig":3,"./il2cpp/CSFileOut":5,"./il2cpp/Il2CppTypeEnum":7,"./il2cpp/il2cppApi":9,"./il2cpp/struct/utils":21,"./il2cpp/tabledefs":22,"./ios/IOSUtils":24,"./logger":26}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSFileOut = void 0;
const dumpconfig_1 = require("../dumpconfig");
const FileUtils_1 = require("./FileUtils");
const il2cppApi_1 = require("./il2cppApi");
exports.CSFileOut = {
    createDir: function (filePath) {
        let split = filePath.split('/');
        let path = "";
        for (let i = 0; i < split.length; i++) {
            if (i + 1 === split.length) {
                break;
            }
            else {
                path += split[i] + "/";
                FileUtils_1.FileUtils.createDir(path);
            }
        }
    },
    addParentAndInterfaceNamespaze(klass) {
        let parent = klass.parent();
        if (!parent.isNull()) {
            let namespaze = parent.namespaze();
            if (namespaze !== "") {
                klass.addNeedNameSpace(namespaze);
            }
        }
        let interfaces;
        // interfaces
        let iter = Memory.alloc(Process.pointerSize);
        while (!(interfaces = klass.getInterfaces(iter)).isNull()) {
            let interfaceNameSpace = interfaces.namespaze();
            // log("interfaceNameSpace " + interfaceNameSpace)
            if (interfaceNameSpace !== "") {
                klass.addNeedNameSpace(interfaceNameSpace);
            }
        }
    },
    addFieldTypeNamespaze(klass) {
        //Field type
        let filedCount = klass.filedCount();
        if (filedCount > 0) {
            let iter = Memory.alloc(Process.pointerSize);
            let filedInfo;
            while (!(filedInfo = klass.getFieldsInfo(iter)).isNull()) {
                let fieldClass = filedInfo.getFiledClass();
                if (fieldClass.namespaze() !== "") {
                    klass.addNeedNameSpace(fieldClass.namespaze());
                }
            }
        }
        //property
    },
    addPropertyInfo: function (klass) {
        let iter = Memory.alloc(Process.pointerSize);
        let propertyInfo;
        while (!(propertyInfo = klass.getProperties(iter)).isNull()) {
            let pro_class;
            let method = propertyInfo.getMethod();
            let setMethod = propertyInfo.setMethod();
            if (method.isNull() && setMethod.isNull()) {
                continue;
            }
            if (!method.isNull()) {
                pro_class = il2cppApi_1.il2cppApi.il2cpp_class_from_type(method.getReturnType());
            }
            else if (!setMethod.isNull()) {
                pro_class = il2cppApi_1.il2cppApi.il2cpp_class_from_type(setMethod.getReturnType());
            }
            klass.addNeedNameSpace(pro_class.namespaze());
        }
    },
    addMethodInfo: function (klass) {
        let iter = Memory.alloc(Process.pointerSize);
        let methodInfo;
        while (!(methodInfo = klass.getMethods(iter)).isNull()) {
            let returnType = methodInfo.getReturnType();
            let return_cls = il2cppApi_1.il2cppApi.il2cpp_class_from_type(returnType);
            let paramCount = methodInfo.getParamCount();
            klass.addNeedNameSpace(return_cls.namespaze());
            if (paramCount > 0) {
                for (let i = 0; i < paramCount; i++) {
                    let paramType = methodInfo.getParam(i);
                    let paramCls = il2cppApi_1.il2cppApi.il2cpp_class_from_type(paramType);
                    klass.addNeedNameSpace(paramCls.namespaze());
                }
            }
        }
    },
    outClass: function (klass, csStr) {
        if (klass.isNull()) {
            return;
        }
        let il2CppImage = il2cppApi_1.il2cppApi.il2cpp_class_get_image(klass);
        let nameNoExt = il2CppImage.nameNoExt();
        // system dll dont need out
        if (nameNoExt === "mscorlib" || nameNoExt === "Mono.Security") {
            return;
        }
        if (nameNoExt === "System" || nameNoExt === "System.Xml" || nameNoExt === "System.Core" || nameNoExt === "System.Configuration") {
            return;
        }
        if (nameNoExt === "Newtonsoft.Json") {
            return;
        }
        //unity dll dont need
        if (nameNoExt.includes("UnityEngine")) {
            return;
        }
        if (klass.name() === "<Module>") { //ignore <Module>
            return;
        }
        if (klass.name().includes("<>__")) { //ignore <>__*
            return;
        }
        //ignore <PrivateImplementationDetails>
        if (klass.name().includes("<PrivateImplementationDetails>")) {
            return;
        }
        if (klass.name().includes("$ArrayType")) {
            return;
        }
        if (klass.name().includes("=")) {
            return;
        }
        if (klass.name().includes("<")) {
            return;
        }
        if (klass.name().includes("`")) { //dont need generic class
            return;
        }
        // log("need out klass " + klass.name())
        //生成cs文件
        //parent
        this.addParentAndInterfaceNamespaze(klass);
        this.addFieldTypeNamespaze(klass);
        this.addPropertyInfo(klass);
        this.addMethodInfo(klass);
        let outCs = "";
        for (let i = 0; i < klass.needNameSpace.length; i++) {
            //this class need namespace
            let needNameSpaceElement = klass.needNameSpace[i];
            // log("needNameSpace " + needNameSpaceElement)
            if (needNameSpaceElement !== "") {
                outCs += "using " + needNameSpaceElement + ";\n";
            }
        }
        outCs += "\n";
        //import namespace
        let namespaze = klass.namespaze();
        if (namespaze !== "") {
            outCs += "namespace " + namespaze + "{\n";
            outCs += csStr;
            outCs += "}\n";
        }
        else {
            outCs += csStr;
        }
        let filePath;
        if (namespaze !== "") {
            filePath = dumpconfig_1.CSFileDir + "/" + nameNoExt + "/" + namespaze + "/" + klass.name() + ".cs";
        }
        else {
            filePath = dumpconfig_1.CSFileDir + "/" + nameNoExt + "/" + klass.name() + ".cs";
        }
        // log("filePath " + filePath);
        //create dir
        this.createDir(filePath);
        //write file
        FileUtils_1.FileUtils.writeFile(filePath, outCs);
    }
};
},{"../dumpconfig":3,"./FileUtils":6,"./il2cppApi":9}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileUtils = void 0;
const logger_1 = require("../logger");
var mkdir = new NativeFunction(Module.findExportByName("libc.so", 'mkdir'), 'int', ['pointer', 'int']);
var access = new NativeFunction(Module.findExportByName("libc.so", 'access'), 'int', ['pointer', 'int']);
const F_OK = 0; // 用于检查文件的存在性
const libc = Process.getModuleByName('libc.so');
const fopen = new NativeFunction(libc.getExportByName('fopen'), 'pointer', ['pointer', 'pointer']);
const fwrite = new NativeFunction(libc.getExportByName('fwrite'), 'uint', ['pointer', 'uint', 'uint', 'pointer']);
const fclose = new NativeFunction(libc.getExportByName('fclose'), 'int', ['pointer']);
const strlen = new NativeFunction(Module.findExportByName(null, 'strlen'), 'size_t', ['pointer']);
var strerror = new NativeFunction(Module.findExportByName("libc.so", 'strerror'), 'pointer', ['int']);
exports.FileUtils = {
    writeFile: function (path, data) {
        //use java
        //
        const file = fopen(Memory.allocUtf8String(path), Memory.allocUtf8String('w'));
        if (file.isNull()) {
            console.error('Failed to open file');
            return;
        }
        let dataPtr = Memory.allocUtf8String(data);
        const dataSize = strlen(dataPtr) + 0;
        const bytesWritten = fwrite(dataPtr, 1, dataSize, file);
        if (bytesWritten !== dataSize) {
            console.error('Failed to write to file');
            fclose(file);
            return;
        }
        fclose(file);
        // log("file out success");
    },
    createFile: function (outpath) {
    },
    createDir: function (path) {
        let nativePointer = Memory.allocUtf8String(path);
        if (access(nativePointer, F_OK) === -1) {
            // log("create Dir "+path)
            let result = mkdir(nativePointer, 0o777);
            if (result === 0) {
                // log("Directory created successfully: " + path);
            }
            else {
                var errnoPtr = Module.findExportByName(null, "__errno");
                var errno = Memory.readPointer(ptr(errnoPtr)).toInt32();
                // 获取并打印错误消息
                var strerror = new NativeFunction(Module.findExportByName("libc.so", 'strerror'), 'pointer', ['int']);
                var messagePtr = strerror(errno);
                var message = Memory.readUtf8String(messagePtr);
                (0, logger_1.log)("Failed to create directory: " + path + ". Reason: " + message);
            }
        }
    }
};
},{"../logger":26}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Il2CppTypeEnum = void 0;
exports.Il2CppTypeEnum = {
    IL2CPP_TYPE_END: 0x00,
    IL2CPP_TYPE_VOID: 0x01,
    IL2CPP_TYPE_BOOLEAN: 0x02,
    IL2CPP_TYPE_CHAR: 0x03,
    IL2CPP_TYPE_I1: 0x04,
    IL2CPP_TYPE_U1: 0x05,
    IL2CPP_TYPE_I2: 0x06,
    IL2CPP_TYPE_U2: 0x07,
    IL2CPP_TYPE_I4: 0x08,
    IL2CPP_TYPE_U4: 0x09,
    IL2CPP_TYPE_I8: 0x0a,
    IL2CPP_TYPE_U8: 0x0b,
    IL2CPP_TYPE_R4: 0x0c,
    IL2CPP_TYPE_R8: 0x0d,
    IL2CPP_TYPE_STRING: 0x0e,
    IL2CPP_TYPE_PTR: 0x0f,
    IL2CPP_TYPE_BYREF: 0x10,
    IL2CPP_TYPE_VALUETYPE: 0x11,
    IL2CPP_TYPE_CLASS: 0x12,
    IL2CPP_TYPE_VAR: 0x13,
    IL2CPP_TYPE_ARRAY: 0x14,
    IL2CPP_TYPE_GENERICINST: 0x15,
    IL2CPP_TYPE_TYPEDBYREF: 0x16,
    IL2CPP_TYPE_I: 0x18,
    IL2CPP_TYPE_U: 0x19,
    IL2CPP_TYPE_FNPTR: 0x1b,
    IL2CPP_TYPE_OBJECT: 0x1c,
    IL2CPP_TYPE_SZARRAY: 0x1d,
    IL2CPP_TYPE_MVAR: 0x1e,
    IL2CPP_TYPE_CMOD_REQD: 0x1f,
    IL2CPP_TYPE_CMOD_OPT: 0x20,
    IL2CPP_TYPE_INTERNAL: 0x21,
    IL2CPP_TYPE_MODIFIER: 0x40,
    IL2CPP_TYPE_SENTINEL: 0x41,
    IL2CPP_TYPE_PINNED: 0x45,
    IL2CPP_TYPE_ENUM: 0x55
};
},{}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Il2cppString = void 0;
const NativeStruct_1 = require("../../struct/NativeStruct");
const il2cppApi_1 = require("../../il2cppApi");
class Il2cppString extends NativeStruct_1.NativeStruct {
    static parserString(str) {
        // 获取MonoString的长度
        if (str.isNull()) {
            return "空";
        }
        // logHHex(str)
        let il2CppBase = Process.pointerSize * 2;
        var length = Memory.readU32(str.add(il2CppBase));
        // 获取MonoString的字符数据的指针（UTF-16编码）
        var charsPtr = str.add(il2CppBase + 0x4);
        // 从UTF-16编码的字符数据创建JavaScript字符串
        return Memory.readUtf16String(charsPtr, length);
    }
    static parser(systemString) {
        if (systemString.isNull()) {
            return "指针空";
        }
        let length = il2cppApi_1.il2cppApi.il2cpp_string_length(systemString);
        let il2cppStringChars = il2cppApi_1.il2cppApi.il2cpp_string_chars(systemString);
        let content = "";
        for (let i = 0; i < length; i++) {
            let offset = i * 2;
            let s = il2cppStringChars.add(offset).readU16().toString(16);
            if (s.toString().length === 2) {
                let s2 = il2cppStringChars.add(offset).readCString();
                content = content + s2;
            }
            else {
                //转换unicode
                let unicode = "\\u" + s.toString();
                let decodeUnicode1 = this.decodeUnicode(unicode);
                content = content + decodeUnicode1;
            }
        }
        return content;
    }
    getCString() {
        if (this.isNull()) {
            return "指针空";
        }
        let length = this.getLength();
        //长度4字节本身偏移16 从20位开始
        let il2cppStringChars = il2cppApi_1.il2cppApi.il2cpp_string_chars(this);
        let content = "";
        for (let i = 0; i < length; i++) {
            let offset = i * 2;
            let s = il2cppStringChars.add(offset).readU16().toString(16);
            // console.log("il2cppStringChars:" + s);
            //转unicode
            if (s.toString().length === 2) {
                let s2 = il2cppStringChars.add(offset).readCString();
                // log("s2:"+s2);
                content = content + s2;
            }
            else {
                //转换unicode
                let unicode = "\\u" + s.toString();
                // log("unicode:" + unicode);
                let decodeUnicode1 = this.decodeUnicode(unicode);
                content = content + decodeUnicode1;
                // log("s2:"+this.decodeUnicode(unicode));
            }
            // let s1 = String.fromCharCode(unicode);
        }
        if (content === undefined) {
            return "";
        }
        return content;
    }
    getLength() {
        return il2cppApi_1.il2cppApi.il2cpp_string_length(this);
    }
    static decodeUnicode(str) {
        let replace = str.replace(/\\/g, "%");
        return unescape(replace);
    }
}
exports.Il2cppString = Il2cppString;
},{"../../il2cppApi":9,"../../struct/NativeStruct":19}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.il2cppApi = void 0;
const Il2CppImage_1 = require("./struct/Il2CppImage");
const Il2CppClass_1 = require("./struct/Il2CppClass");
const Il2CppType_1 = require("./struct/Il2CppType");
const Il2CppFieldInfo_1 = require("./struct/Il2CppFieldInfo");
const Il2CppPropertyInfo_1 = require("./struct/Il2CppPropertyInfo");
const MethodInfo_1 = require("./struct/MethodInfo");
const dumpconfig_1 = require("../dumpconfig");
const LinkerHelper_1 = require("../linker/LinkerHelper");
let il2CppHandle = null;
let nativeFunMap = new Map();
let dlsym = null;
exports.il2cppApi = {
    nativeFunNotExistMap: new Map(),
    il2cpp_array_new: function (klass, size) {
        let il2cpp_array_new = this.load("il2cpp_array_new", 'pointer', ['pointer', 'uint64']);
        return il2cpp_array_new(klass, size);
    },
    il2cpp_array_get_byte_length: function (array) {
        let il2cpp_array_get_byte_length = this.load("il2cpp_array_get_byte_length", 'uint32', ['pointer']);
        return il2cpp_array_get_byte_length(array);
    },
    il2cpp_domain_get: function () {
        return this.load("il2cpp_domain_get", 'pointer', []);
    },
    il2cpp_thread_attach: function (domain) {
        return this.load("il2cpp_thread_attach", 'pointer', ['pointer']);
    },
    il2cpp_string_length: function (Il2cppString) {
        let il2cpp_string_length = this.load("il2cpp_string_length", "int", ['pointer']);
        return il2cpp_string_length(Il2cppString);
    },
    il2cpp_string_chars: function (Il2cppString) {
        let il2cpp_string_chars = this.load("il2cpp_string_chars", "pointer", ['pointer']);
        return il2cpp_string_chars(Il2cppString);
    },
    il2cpp_string_new: function (str) {
        let il2cpp_string_new = this.load("il2cpp_string_new", "pointer", ['pointer']);
        return il2cpp_string_new(str);
    },
    il2cpp_domain_get_assemblies: function (il2Cppdomain, size_t) {
        let il2cpp_domain_get_assemblies = this.load("il2cpp_domain_get_assemblies", 'pointer', ['pointer', 'pointer']);
        return il2cpp_domain_get_assemblies(il2Cppdomain, size_t);
    },
    il2cpp_gc_collect_a_little: function () {
        let il2cpp_gc_collect_a_little = this.load("il2cpp_gc_collect_a_little" +
            "", 'pointer', ['pointer', 'pointer']);
        return il2cpp_gc_collect_a_little(il2Cppdomain, size_t);
    },
    il2cpp_assembly_get_image: function (il2Cppassembly) {
        let il2cpp_assembly_get_image = this.load("il2cpp_assembly_get_image", 'pointer', ['pointer']);
        try {
            return new Il2CppImage_1.Il2CppImage(il2cpp_assembly_get_image(il2Cppassembly));
        }
        catch (e) {
            return new Il2CppImage_1.Il2CppImage(il2Cppassembly.readPointer());
        }
    },
    il2cpp_image_get_class_count: function (image) {
        // size_t il2cpp_image_get_class_count(const Il2CppImage * image)
        let il2cpp_image_get_class_count = this.load("il2cpp_image_get_class_count", "pointer", ['pointer']);
        if (il2cpp_image_get_class_count !== undefined) {
            return il2cpp_image_get_class_count(image).toUInt32();
        }
        else {
            return image.getOffsetTypeCount();
        }
    },
    il2cpp_image_get_name: function (Il2CppImage) {
        let il2cpp_image_get_name = this.load("il2cpp_image_get_name", "pointer", ['pointer']);
        return il2cpp_image_get_name(Il2CppImage);
    },
    il2cpp_image_get_class: function (il2CppImage, index) {
        // // const Il2CppClass* il2cpp_image_get_class(const Il2CppImage * image, size_t index)
        let il2cpp_image_get_class = this.load("il2cpp_image_get_class", 'pointer', ['pointer', 'int']);
        let il2cppImageGetClass = il2cpp_image_get_class(il2CppImage, index);
        return new Il2CppClass_1.Il2CppClass(il2cppImageGetClass);
    },
    il2cpp_class_get_type: function (il2CppClass) {
        let il2cpp_class_get_type = this.load("il2cpp_class_get_type", 'pointer', ["pointer"]);
        return new Il2CppType_1.Il2CppType(il2cpp_class_get_type(il2CppClass));
    },
    il2cpp_class_get_element_class: function (cls) {
        let il2cpp_class_get_element_class = this.load("il2cpp_class_get_element_class", 'pointer', ["pointer"]);
        return new Il2CppClass_1.Il2CppClass(il2cpp_class_get_element_class(cls));
    },
    il2cpp_class_get_declaring_type: function (cls) {
        let il2cpp_class_get_declaring_type = this.load("il2cpp_class_get_declaring_type", 'pointer', ["pointer"]);
        return new Il2CppClass_1.Il2CppClass(il2cpp_class_get_declaring_type(cls));
    },
    il2cpp_class_from_type: function (Il2CppType) {
        let il2cpp_class_from_type = this.load("il2cpp_class_from_type", "pointer", ["pointer"]);
        if (Il2CppType === null) {
            return null;
        }
        return new Il2CppClass_1.Il2CppClass(il2cpp_class_from_type(Il2CppType));
    },
    il2cpp_class_get_image: function (klass) {
        let il2cpp_class_get_image = this.load("il2cpp_class_get_image", "pointer", ["pointer"]);
        return new Il2CppImage_1.Il2CppImage(il2cpp_class_get_image(klass));
    },
    il2cpp_class_from_name: function (Il2cppImage, nameSpaze, name) {
        let il2cpp_class_from_name = this.load("il2cpp_class_from_name", "pointer", ["pointer", "pointer", "pointer"]);
        let nameSpaze_t = Memory.allocUtf8String(nameSpaze);
        let name_t = Memory.allocUtf8String(name);
        return new Il2CppClass_1.Il2CppClass(il2cpp_class_from_name(Il2cppImage, nameSpaze_t, name_t));
    },
    il2cpp_class_enum_basetype: function (Il2CppClass) {
        let il2cpp_class_enum_basetype = this.load("il2cpp_class_enum_basetype", "pointer", ["pointer"]);
        return new Il2CppType_1.Il2CppType(il2cpp_class_enum_basetype(Il2CppClass));
    },
    il2cpp_class_value_size: function (Il2CppClass, align) {
        let il2cpp_class_value_size = this.load("il2cpp_class_value_size", "int32", ["pointer", "pointer"]);
        return il2cpp_class_value_size(Il2CppClass);
    },
    il2cpp_class_get_flags: function (Il2CppClass) {
        let il2cpp_class_get_flags = this.load("il2cpp_class_get_flags", "int", ["pointer"]);
        return il2cpp_class_get_flags(Il2CppClass);
    },
    il2cpp_class_is_valuetype: function (Il2CppClass) {
        let il2cpp_class_is_valuetype = this.load("il2cpp_class_is_valuetype", "bool", ["pointer"]);
        return il2cpp_class_is_valuetype(Il2CppClass);
    },
    il2cpp_class_is_generic: function (Il2CppClass) {
        let il2cpp_class_is_generic = this.load("il2cpp_class_is_generic", "bool", ["pointer"]);
        return il2cpp_class_is_generic(Il2CppClass);
    },
    il2cpp_class_is_enum: function (Il2CppClass) {
        let il2cpp_class_is_enum = this.load("il2cpp_class_is_enum", "bool", ["pointer"]);
        return il2cpp_class_is_enum(Il2CppClass);
    },
    il2cpp_class_get_name: function (Il2CppClass) {
        let il2cpp_class_get_name = this.load("il2cpp_class_get_name", "pointer", ["pointer"]);
        return il2cpp_class_get_name(Il2CppClass);
    },
    il2cpp_class_get_parent: function (Il2CppClass) {
        let il2cpp_class_get_parent = this.load("il2cpp_class_get_parent", "pointer", ["pointer"]);
        return il2cpp_class_get_parent(Il2CppClass);
    },
    il2cpp_class_get_interfaces: function (cls, iter) {
        let il2cpp_class_get_interfaces = this.load("il2cpp_class_get_interfaces", 'pointer', ['pointer', 'pointer']);
        return new Il2CppClass_1.Il2CppClass(il2cpp_class_get_interfaces(cls, iter));
    },
    il2cpp_class_get_namespace: function (Il2CppClass) {
        let il2cpp_class_get_namespace = this.load("il2cpp_class_get_namespace", 'pointer', ['pointer']);
        return il2cpp_class_get_namespace(Il2CppClass);
    },
    il2cpp_class_num_fields: function (Il2CppClass) {
        let il2cpp_class_num_fields = this.load("il2cpp_class_num_fields", 'size_t', ['pointer']);
        return il2cpp_class_num_fields(Il2CppClass);
    },
    il2cpp_class_get_fields: function (Il2CppClass, iter) {
        let il2cpp_class_get_fields = this.load("il2cpp_class_get_fields", 'pointer', ['pointer', 'pointer']);
        return new Il2CppFieldInfo_1.Il2CppFieldInfo(il2cpp_class_get_fields(Il2CppClass, iter));
    },
    il2cpp_class_get_properties: function (Il2CppClass, iter) {
        let il2cpp_class_get_properties = this.load("il2cpp_class_get_properties", 'pointer', ['pointer', 'pointer']);
        return new Il2CppPropertyInfo_1.Il2CppPropertyInfo(il2cpp_class_get_properties(Il2CppClass, iter));
    },
    il2cpp_class_get_methods: function (Il2CppClass, iter) {
        let il2cpp_class_get_methods = this.load("il2cpp_class_get_methods", 'pointer', ['pointer', 'pointer']);
        return new MethodInfo_1.MethodInfo(il2cpp_class_get_methods(Il2CppClass, iter));
    },
    il2cpp_class_get_method_from_name: function (Il2CppClass, name, argsCount) {
        let il2cpp_class_get_method_from_name = this.load("il2cpp_class_get_method_from_name", 'pointer', ['pointer', 'pointer', "int"]);
        let name_t = Memory.allocUtf8String(name);
        return new MethodInfo_1.MethodInfo(il2cpp_class_get_method_from_name(Il2CppClass, name_t, argsCount));
    },
    il2cpp_type_get_type: function (Il2CppType) {
        let il2cpp_type_get_type = this.load("il2cpp_type_get_type", 'int', ['pointer']);
        return il2cpp_type_get_type(Il2CppType);
    },
    /**
     * 非必要参数
     * @param Il2CppType
     * @returns {number|*}
     */
    il2cpp_type_is_byref: function (Il2CppType) {
        let il2cpp_type_is_byref = this.load("il2cpp_type_is_byref", "bool", ["pointer"]);
        // log(" il2cpp_type_is_byref:"+il2cpp_type_is_byref);
        if (il2cpp_type_is_byref !== undefined) {
            return il2cpp_type_is_byref(Il2CppType);
        }
        return Il2CppType.add(4).readS8();
    },
    il2cpp_type_get_attrs: function (Il2cppType) {
        let il2cpp_type_get_attrs = this.load("il2cpp_type_get_attrs", "int32", ["pointer"]);
        return il2cpp_type_get_attrs(Il2cppType);
    },
    il2cpp_type_get_object: function (Il2CppType) {
        let il2cpp_type_get_object = this.load("il2cpp_type_get_object", 'pointer', ['pointer']);
        return il2cpp_type_get_object(Il2CppType);
    },
    il2cpp_type_get_name: function (Il2CppType) {
        let il2cpp_type_get_name = this.load("il2cpp_type_get_name", 'pointer', ['pointer']);
        try {
            return il2cpp_type_get_name(Il2CppType);
        }
        catch (e) {
            return null;
        }
    },
    il2cpp_field_static_get_value: function (FieldInfo, value) {
        let il2cpp_field_static_get_value = this.load("il2cpp_field_static_get_value", 'void', ['pointer', 'pointer']);
        return il2cpp_field_static_get_value(FieldInfo, value);
    },
    il2cpp_field_get_parent: function (FieldInfo) {
        let il2cpp_field_get_parent = this.load("il2cpp_field_get_parent", 'pointer', ['pointer']);
        return new Il2CppClass_1.Il2CppClass(il2cpp_field_get_parent(FieldInfo));
    },
    il2cpp_field_get_flags: function (FieldInfo) {
        let il2cpp_field_get_flags = this.load("il2cpp_field_get_flags", "int", ['pointer']);
        return il2cpp_field_get_flags(FieldInfo);
    },
    il2cpp_field_get_type: function (FieldInfo) {
        let il2cpp_field_get_type = this.load("il2cpp_field_get_type", "pointer", ['pointer']);
        return new Il2CppType_1.Il2CppType(il2cpp_field_get_type(FieldInfo));
    },
    il2cpp_field_get_name: function (FieldInfo) {
        let il2cpp_field_get_name = this.load("il2cpp_field_get_name", "pointer", ['pointer']);
        return il2cpp_field_get_name(FieldInfo);
    },
    il2cpp_field_get_offset: function (FieldInfo) {
        let il2cpp_field_get_offset = this.load("il2cpp_field_get_offset", "size_t", ['pointer']);
        return il2cpp_field_get_offset(FieldInfo);
    },
    il2cpp_property_get_get_method: function (PropertyInfo) {
        let il2cpp_property_get_get_method = this.load("il2cpp_property_get_get_method", "pointer", ['pointer']);
        return new MethodInfo_1.MethodInfo(il2cpp_property_get_get_method(PropertyInfo));
    },
    il2cpp_property_get_set_method: function (PropertyInfo) {
        let il2cpp_property_get_set_method = this.load("il2cpp_property_get_set_method", "pointer", ['pointer']);
        return new MethodInfo_1.MethodInfo(il2cpp_property_get_set_method(PropertyInfo));
    },
    il2cpp_property_get_name: function (PropertyInfo) {
        let il2cpp_property_get_name = this.load("il2cpp_property_get_name", "pointer", ['pointer']);
        return il2cpp_property_get_name(PropertyInfo);
    },
    il2cpp_method_get_flags: function (method, iflags) {
        let il2cpp_method_get_flags_api = this.load("il2cpp_method_get_flags", "uint32", ['pointer', 'uint32']);
        return il2cpp_method_get_flags_api(method, iflags);
    },
    il2cpp_method_get_name: function (method) {
        let il2cpp_method_get_name = this.load("il2cpp_method_get_name", "pointer", ['pointer']);
        return il2cpp_method_get_name(method);
    },
    il2cpp_method_get_class: function (method) {
        let il2cpp_method_get_class = this.load("il2cpp_method_get_class", "pointer", ['pointer']);
        return il2cpp_method_get_class(method);
    },
    il2cpp_method_get_pointer: function (method) {
        //版本兼容有问题
        let il2cpp_method_get_pointer = this.load("il2cpp_method_get_pointer", "pointer", ['pointer']);
        if (il2cpp_method_get_pointer !== undefined) {
            return il2cpp_method_get_pointer(method);
        }
        return method.readPointer();
    },
    il2cpp_method_get_param_count: function (method) {
        let il2cpp_method_get_param_count = this.load("il2cpp_method_get_param_count", "uint32", ['pointer']);
        return il2cpp_method_get_param_count(method);
    },
    il2cpp_method_get_return_type: function (method) {
        let il2cpp_method_get_return_type = this.load("il2cpp_method_get_return_type", "pointer", ['pointer']);
        return new Il2CppType_1.Il2CppType(il2cpp_method_get_return_type(method));
    },
    il2cpp_method_get_param: function (method, index) {
        let il2cpp_method_get_param = this.load("il2cpp_method_get_param", "pointer", ['pointer', 'uint32']);
        return new Il2CppType_1.Il2CppType(il2cpp_method_get_param(method, index));
    },
    il2cpp_method_is_generic: function (method) {
        let il2cpp_method_is_generic = this.load("il2cpp_method_is_generic", "bool", ['pointer']);
        return il2cpp_method_is_generic(method);
    },
    il2cpp_array_length(arg) {
        let il2cpp_array_length = this.load("il2cpp_array_length", "uint32", ['pointer']);
        return il2cpp_array_length(arg);
    },
    il2cpp_method_is_inflated: function (method) {
        let il2cpp_method_is_inflated = this.load("il2cpp_method_is_inflated", "bool", ['pointer']);
        return il2cpp_method_is_inflated(method);
    },
    il2cpp_method_get_param_name: function (method, index) {
        let il2cpp_method_get_param_name = this.load("il2cpp_method_get_param_name", "pointer", ['pointer', 'uint32']);
        return il2cpp_method_get_param_name(method, index);
    },
    /**
     * 使用内存缓存加快dump速度
     * @param exportName
     * @param reType
     * @param argTypes
     * @returns {any}
     */
    load: function (exportName, reType, argTypes) {
        if (dumpconfig_1.useSoInfo) {
            if (il2CppHandle === null) {
                il2CppHandle = LinkerHelper_1.linkerHelper.getIl2CppHandle();
            }
            if (dlsym === null) {
                let dlsymAddr = Module.findExportByName(null, "dlsym");
                dlsym = new NativeFunction(dlsymAddr, 'pointer', ['pointer', 'pointer']);
            }
            let cacheFun = nativeFunMap.get(exportName);
            if (cacheFun == null) {
                let isExist = this.nativeFunNotExistMap.get(exportName);
                if (isExist === -1) {
                    return undefined;
                }
                let nativePointer = dlsym(il2CppHandle, Memory.allocUtf8String(exportName));
                if (nativePointer == null) {
                    this.nativeFunNotExistMap.set(exportName, -1);
                    return undefined;
                }
                else {
                    cacheFun = new NativeFunction(nativePointer, reType, argTypes);
                    nativeFunMap.set(exportName, cacheFun);
                }
            }
            return nativeFunMap.get(exportName);
        }
        else {
            let cacheFun = nativeFunMap.get(exportName);
            if (cacheFun == null) {
                let isExist = this.nativeFunNotExistMap.get(exportName);
                if (isExist === -1) {
                    return undefined;
                }
                let nativePointer = Module.findExportByName(dumpconfig_1.soName, exportName);
                if (nativePointer == null) {
                    this.nativeFunNotExistMap.set(exportName, -1);
                    return undefined;
                }
                else {
                    cacheFun = new NativeFunction(nativePointer, reType, argTypes);
                    nativeFunMap.set(exportName, cacheFun);
                }
            }
            return nativeFunMap.get(exportName);
        }
    },
};
},{"../dumpconfig":3,"../linker/LinkerHelper":25,"./struct/Il2CppClass":10,"./struct/Il2CppFieldInfo":11,"./struct/Il2CppImage":15,"./struct/Il2CppPropertyInfo":16,"./struct/Il2CppType":17,"./struct/MethodInfo":18}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Il2CppClass = void 0;
const NativeStruct_1 = require("./NativeStruct");
const il2cppApi_1 = require("../il2cppApi");
const Il2CppImage_1 = require("./Il2CppImage");
class Il2CppClass extends NativeStruct_1.NativeStruct {
    constructor(pointer) {
        super(pointer);
        this.needNameSpace = [];
    }
    addNeedNameSpace(str) {
        if (!this.needNameSpace.includes(str)) {
            this.needNameSpace.push(str);
        }
    }
    name() {
        return il2cppApi_1.il2cppApi.il2cpp_class_get_name(this).readCString();
    }
    image() {
        return new Il2CppImage_1.Il2CppImage(il2cppApi_1.il2cppApi.il2cpp_class_get_image(this));
    }
    namespaze() {
        return il2cppApi_1.il2cppApi.il2cpp_class_get_namespace(this).readCString();
    }
    flags() {
        return il2cppApi_1.il2cppApi.il2cpp_class_get_flags(this);
    }
    valueType() {
        return il2cppApi_1.il2cppApi.il2cpp_class_is_valuetype(this);
    }
    enumType() {
        return il2cppApi_1.il2cppApi.il2cpp_class_is_enum(this);
    }
    isGeneric() {
        return il2cppApi_1.il2cppApi.il2cpp_class_is_generic(this);
    }
    /**
     * class_type
     */
    getType() {
        return il2cppApi_1.il2cppApi.il2cpp_class_get_type(this);
    }
    getElementClass() {
        return il2cppApi_1.il2cppApi.il2cpp_class_get_element_class(this);
    }
    getDeclaringType() {
        return il2cppApi_1.il2cppApi.il2cpp_class_get_declaring_type(this);
    }
    filedCount() {
        return il2cppApi_1.il2cppApi.il2cpp_class_num_fields(this);
    }
    /**
     *
     * @returns {Il2CppType}
     */
    getEnumBaseType() {
        return il2cppApi_1.il2cppApi.il2cpp_class_enum_basetype(this);
    }
    getFieldsInfo(iter) {
        return il2cppApi_1.il2cppApi.il2cpp_class_get_fields(this, iter);
    }
    getProperties(iter) {
        return il2cppApi_1.il2cppApi.il2cpp_class_get_properties(this, iter);
    }
    getMethods(iter) {
        return il2cppApi_1.il2cppApi.il2cpp_class_get_methods(this, iter);
    }
    /**
     * 获取泛型参数名
     * @returns {string}
     */
    getGenericName() {
        let type = this.getType();
        let name = this.name();
        if (name.indexOf("`") !== -1) {
            // log("获取Type:Il2cpp:"+this.name() +" nameSpaze:"+this.namespaze());
            let il2cppTypeGetName = type.getName();
            if (il2cppTypeGetName == null) {
                return name;
            }
            let split = name.split("`");
            name = split[0];
            let indexOf = il2cppTypeGetName.indexOf(name);
            let s = il2cppTypeGetName.substr(indexOf + name.length, il2cppTypeGetName.length - name.length);
            let genericT = "\<System.Object\>";
            // log(" genericT:"+genericT);
            if (s === genericT) {
                return "\<T\>";
            }
            return s;
        }
        return name;
    }
    parent() {
        return new Il2CppClass(il2cppApi_1.il2cppApi.il2cpp_class_get_parent(this));
    }
    getInterfaces(iter) {
        return il2cppApi_1.il2cppApi.il2cpp_class_get_interfaces(this, iter);
    }
}
exports.Il2CppClass = Il2CppClass;
},{"../il2cppApi":9,"./Il2CppImage":15,"./NativeStruct":19}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Il2CppFieldInfo = void 0;
const NativeStruct_1 = require("./NativeStruct");
const il2cppApi_1 = require("../il2cppApi");
const utils_1 = require("./utils");
const Il2CppClass_1 = require("./Il2CppClass");
class Il2CppFieldInfo extends NativeStruct_1.NativeStruct {
    getFlags() {
        return il2cppApi_1.il2cppApi.il2cpp_field_get_flags(this);
    }
    /**
     * 获取变量参数类型
     * @returns {Il2CppType}
     */
    getType() {
        return il2cppApi_1.il2cppApi.il2cpp_field_get_type(this);
    }
    /**
     * 获取 静态常量
     * @param value
     */
    getStaticValue() {
        let value = Memory.alloc(Process.pointerSize);
        il2cppApi_1.il2cppApi.il2cpp_field_static_get_value(this, value);
        return utils_1.utils.readTypeEnumValue(value, this.getType().getTypeEnum(), this.getFiledClass());
    }
    /**
     *  获取变量class
     * @returns {Il2CppClass}
     */
    getFiledClass() {
        let type = this.getType();
        return il2cppApi_1.il2cppApi.il2cpp_class_from_type(type);
    }
    getParent() {
        let il2CppClass = il2cppApi_1.il2cppApi.il2cpp_field_get_parent(this);
        return new Il2CppClass_1.Il2CppClass(il2CppClass);
    }
    /**
     * 获取变量参数的命名
     * @returns {string}
     */
    getFiledName() {
        return il2cppApi_1.il2cppApi.il2cpp_field_get_name(this).readCString();
    }
    /**
     * 获取偏移
     * @returns {*}
     */
    getOffset() {
        return il2cppApi_1.il2cppApi.il2cpp_field_get_offset(this);
    }
}
exports.Il2CppFieldInfo = Il2CppFieldInfo;
},{"../il2cppApi":9,"./Il2CppClass":10,"./NativeStruct":19,"./utils":21}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Il2CppGenericContext = void 0;
const NativeStruct_1 = require("./NativeStruct");
const Il2CppGenericInst_1 = require("./Il2CppGenericInst");
class Il2CppGenericContext extends NativeStruct_1.NativeStruct {
    method_inst() {
        return new Il2CppGenericInst_1.Il2CppGenericInst(this.add(0x8));
    }
}
exports.Il2CppGenericContext = Il2CppGenericContext;
},{"./Il2CppGenericInst":13,"./NativeStruct":19}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Il2CppGenericInst = void 0;
const NativeStruct_1 = require("./NativeStruct");
class Il2CppGenericInst extends NativeStruct_1.NativeStruct {
    type_argc() {
        return this.readU32();
    }
}
exports.Il2CppGenericInst = Il2CppGenericInst;
},{"./NativeStruct":19}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Il2CppGenericMethod = void 0;
const NativeStruct_1 = require("./NativeStruct");
const Il2CppGenericContext_1 = require("./Il2CppGenericContext");
class Il2CppGenericMethod extends NativeStruct_1.NativeStruct {
    context() {
        return new Il2CppGenericContext_1.Il2CppGenericContext(this.add(0x8));
    }
}
exports.Il2CppGenericMethod = Il2CppGenericMethod;
},{"./Il2CppGenericContext":12,"./NativeStruct":19}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Il2CppImage = void 0;
const NativeStruct_1 = require("./NativeStruct");
const il2cppApi_1 = require("../il2cppApi");
const structItem_1 = require("./structItem");
const dumpconfig_1 = require("../../dumpconfig");
let il2CppImage_struct = new Array();
il2CppImage_struct.push(new structItem_1.StructItem("name", Process.pointerSize));
il2CppImage_struct.push(new structItem_1.StructItem("nameNoExt", Process.pointerSize));
il2CppImage_struct.push(new structItem_1.StructItem("assemblyIndex", Process.pointerSize));
il2CppImage_struct.push(new structItem_1.StructItem("typeStart", 4));
il2CppImage_struct.push(new structItem_1.StructItem("typeCount", 4));
il2CppImage_struct.push(new structItem_1.StructItem("exportedTypeStart", 4));
let kMetadataIndexBits = 22;
let kMetadataImageIndexExtraShiftBitsA = 6;
let kMetadataImageIndexExtraShiftBitsB = 4;
let kMetadataImageIndexExtraShiftBitsC = 2;
let kMetadataImageIndexExtraShiftBitsD = 0;
let kInvalidIndex = -1;
let kMetadataIndexMaskA = (1 << (kMetadataIndexBits + kMetadataImageIndexExtraShiftBitsA)) - 1;
class Il2CppImage extends NativeStruct_1.NativeStruct {
    name() {
        return il2cppApi_1.il2cppApi.il2cpp_image_get_name(this).readCString();
    }
    token() {
        return this.add(0x40).readU32();
    }
    IsInterpreterImage() {
        let index = this.token();
        // log("got token "+index);
        return index !== kInvalidIndex && (index & ~kMetadataIndexMaskA) !== 0;
    }
    nameNoExt() {
        let name1 = this.name();
        return name1.replace(".dll", "");
    }
    typeStart() {
        return this.get("typeStart").readPointer().toInt32();
    }
    typeCount() {
        return il2cppApi_1.il2cppApi.il2cpp_image_get_class_count(this);
        // return  this.getOffsetTypeCount();
    }
    getOffsetTypeCount() {
        if (dumpconfig_1.UNITY_VER === dumpconfig_1.UnityVer.V_2020) {
            return this.add(24).readPointer().toInt32();
        }
        else {
            return this.get("typeCount").readPointer().toInt32();
        }
    }
    getClass(index) {
        return il2cppApi_1.il2cppApi.il2cpp_image_get_class(this, index);
    }
    get(params) {
        return this.add((0, structItem_1.getStructOffset)(il2CppImage_struct, params));
    }
}
exports.Il2CppImage = Il2CppImage;
},{"../../dumpconfig":3,"../il2cppApi":9,"./NativeStruct":19,"./structItem":20}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Il2CppPropertyInfo = void 0;
const NativeStruct_1 = require("./NativeStruct");
const il2cppApi_1 = require("../il2cppApi");
class Il2CppPropertyInfo extends NativeStruct_1.NativeStruct {
    /**
     * 获取方法信息
     * @returns {MethodInfo}
     */
    getMethod() {
        return il2cppApi_1.il2cppApi.il2cpp_property_get_get_method(this);
    }
    setMethod() {
        return il2cppApi_1.il2cppApi.il2cpp_property_get_set_method(this);
    }
    getName() {
        return il2cppApi_1.il2cppApi.il2cpp_property_get_name(this).readCString();
    }
}
exports.Il2CppPropertyInfo = Il2CppPropertyInfo;
},{"../il2cppApi":9,"./NativeStruct":19}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Il2CppType = void 0;
const NativeStruct_1 = require("./NativeStruct");
const il2cppApi_1 = require("../il2cppApi");
const logger_1 = require("../../logger");
class Il2CppType extends NativeStruct_1.NativeStruct {
    getName() {
        let il2cppTypeGetName = il2cppApi_1.il2cppApi.il2cpp_type_get_name(this);
        if (il2cppTypeGetName == null) {
            return null;
        }
        else {
            return il2cppTypeGetName.readCString();
        }
    }
    getTypeEnum() {
        return il2cppApi_1.il2cppApi.il2cpp_type_get_type(this);
    }
    byref() {
        let il2cppTypeIsByref = il2cppApi_1.il2cppApi.il2cpp_type_is_byref(this);
        (0, logger_1.log)(" il2cppTypeIsByref:" + il2cppTypeIsByref);
        return il2cppTypeIsByref;
    }
}
exports.Il2CppType = Il2CppType;
},{"../../logger":26,"../il2cppApi":9,"./NativeStruct":19}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MethodInfo = void 0;
const NativeStruct_1 = require("./NativeStruct");
const il2cppApi_1 = require("../il2cppApi");
const logger_1 = require("../../logger");
const config_1 = require("../../config");
const Il2CppClass_1 = require("./Il2CppClass");
const Il2CppGenericMethod_1 = require("./Il2CppGenericMethod");
const METHOD_INFO_OFFSET_SLOT = 76;
class MethodInfo extends NativeStruct_1.NativeStruct {
    getGenericMethod() {
        return new Il2CppGenericMethod_1.Il2CppGenericMethod(this.add(0x38));
    }
    getFlags() {
        return il2cppApi_1.il2cppApi.il2cpp_method_get_flags(this, 0);
    }
    getMethodPointer() {
        return il2cppApi_1.il2cppApi.il2cpp_method_get_pointer(this);
    }
    getMethodPointerOffsetToInt() {
        let methodPointer = this.getMethodPointer();
        // log("methodPointer:"+methodPointer);
        if (methodPointer.isNull()) {
            return 0;
        }
        let baseAddr = Module.findBaseAddress(config_1.soName);
        return methodPointer - baseAddr;
    }
    getMethodPointerOffset() {
        let methodPointer = this.getMethodPointer();
        (0, logger_1.log)("methodPointer:" + methodPointer);
        if (methodPointer.isNull()) {
            return "0x0";
        }
        let baseAddr = Module.findBaseAddress(config_1.soName);
        let number = methodPointer - baseAddr;
        return number.toString(16).toUpperCase();
    }
    getSlot() {
        return this.add(METHOD_INFO_OFFSET_SLOT).readU16();
    }
    name() {
        return il2cppApi_1.il2cppApi.il2cpp_method_get_name(this).readCString();
    }
    getParamCount() {
        return il2cppApi_1.il2cppApi.il2cpp_method_get_param_count(this);
    }
    getParam(index) {
        return il2cppApi_1.il2cppApi.il2cpp_method_get_param(this, index);
    }
    getParamName(index) {
        return il2cppApi_1.il2cppApi.il2cpp_method_get_param_name(this, index).readCString();
    }
    /**
     * 获取返回类型
     * @returns {Il2CppType}
     */
    getReturnType() {
        return il2cppApi_1.il2cppApi.il2cpp_method_get_return_type(this);
    }
    is_generic() {
        return il2cppApi_1.il2cppApi.il2cpp_method_is_generic(this);
    }
    is_inflated() {
        return il2cppApi_1.il2cppApi.il2cpp_method_is_inflated(this);
    }
    getClass() {
        return new Il2CppClass_1.Il2CppClass(il2cppApi_1.il2cppApi.il2cpp_method_get_class(this));
    }
    invoker_method() {
        return this.add(0x8).readPointer();
    }
}
exports.MethodInfo = MethodInfo;
},{"../../config":2,"../../logger":26,"../il2cppApi":9,"./Il2CppClass":10,"./Il2CppGenericMethod":14,"./NativeStruct":19}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeStruct = void 0;
class NativeStruct extends NativePointer {
    constructor(pointer) {
        super(pointer);
    }
}
exports.NativeStruct = NativeStruct;
},{}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStructOffset = exports.StructItem = void 0;
function StructItem(param, size) {
    this.param = param;
    this.size = size;
}
exports.StructItem = StructItem;
function getStructOffset(struct, name) {
    let all = 0;
    for (let i = 0; i < struct.length; i++) {
        let item = struct[i];
        let param = item.param;
        let size = item.size;
        if (param === name) {
            if (i === 0) {
                return 0;
            }
            else {
                return all;
            }
        }
        else {
            all = all + size;
        }
    }
}
exports.getStructOffset = getStructOffset;
},{}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.utils = void 0;
const Il2CppTypeEnum_1 = require("../Il2CppTypeEnum");
const tabledefs_1 = require("../tabledefs");
const Il2cppString_1 = require("../hacker/struct/Il2cppString");
exports.utils = {
    readTypeEnumValue: function (pointer, typeEnum, fieldClass) {
        switch (typeEnum) {
            case Il2CppTypeEnum_1.Il2CppTypeEnum.IL2CPP_TYPE_BOOLEAN:
                return !!pointer.readS8();
            case Il2CppTypeEnum_1.Il2CppTypeEnum.IL2CPP_TYPE_I1:
                return pointer.readS8();
            case Il2CppTypeEnum_1.Il2CppTypeEnum.IL2CPP_TYPE_I2:
                return pointer.readS16();
            case Il2CppTypeEnum_1.Il2CppTypeEnum.IL2CPP_TYPE_U2:
                return pointer.readU16();
            case Il2CppTypeEnum_1.Il2CppTypeEnum.IL2CPP_TYPE_I4:
                return pointer.readS32();
            case Il2CppTypeEnum_1.Il2CppTypeEnum.IL2CPP_TYPE_U4:
                return pointer.readU32();
            case Il2CppTypeEnum_1.Il2CppTypeEnum.IL2CPP_TYPE_CHAR:
                return pointer.readU16();
            case Il2CppTypeEnum_1.Il2CppTypeEnum.IL2CPP_TYPE_I8:
                return pointer.readS64();
            case Il2CppTypeEnum_1.Il2CppTypeEnum.IL2CPP_TYPE_U8:
                return pointer.readU64();
            case Il2CppTypeEnum_1.Il2CppTypeEnum.IL2CPP_TYPE_R4:
                return pointer.readFloat();
            case Il2CppTypeEnum_1.Il2CppTypeEnum.IL2CPP_TYPE_R8:
                return pointer.readDouble();
            case Il2CppTypeEnum_1.Il2CppTypeEnum.IL2CPP_TYPE_VALUETYPE:
                let enumBaseType = fieldClass.getEnumBaseType();
                // log("baseType:"+enumBaseType.getTypeEnum()+"pointer:"+pointer.readS32());
                if (enumBaseType.getTypeEnum() === Il2CppTypeEnum_1.Il2CppTypeEnum.IL2CPP_TYPE_I4) {
                    return pointer.readS32();
                }
                return null;
            case Il2CppTypeEnum_1.Il2CppTypeEnum.IL2CPP_TYPE_STRING:
                return "\"" + Il2cppString_1.Il2cppString.parserString(pointer.readPointer()) + "\"";
            default:
                // log("readTypeEnumValue: unknown typeEnum:" + typeEnum);
                return null;
        }
    },
    get_method_static: function (flags) {
        if (flags & tabledefs_1.Tabledefs.METHOD_ATTRIBUTE_STATIC) {
            return true;
        }
        else {
            return false;
        }
    },
    get_method_modifier: function (flags) {
        let content;
        let access = flags & tabledefs_1.Tabledefs.METHOD_ATTRIBUTE_MEMBER_ACCESS_MASK;
        switch (access) {
            case tabledefs_1.Tabledefs.METHOD_ATTRIBUTE_PRIVATE:
                content = "private ";
                break;
            case tabledefs_1.Tabledefs.METHOD_ATTRIBUTE_PUBLIC:
                content = "public ";
                break;
            case tabledefs_1.Tabledefs.METHOD_ATTRIBUTE_FAMILY:
                content = "protected ";
                break;
            case tabledefs_1.Tabledefs.METHOD_ATTRIBUTE_ASSEM:
            case tabledefs_1.Tabledefs.METHOD_ATTRIBUTE_FAM_AND_ASSEM:
                content = "internal ";
                break;
            case tabledefs_1.Tabledefs.METHOD_ATTRIBUTE_FAM_OR_ASSEM:
                content = "protected internal ";
                break;
        }
        if (flags & tabledefs_1.Tabledefs.METHOD_ATTRIBUTE_STATIC) {
            content = content + "static ";
        }
        if (flags & tabledefs_1.Tabledefs.METHOD_ATTRIBUTE_ABSTRACT) {
            content = content + "abstract ";
            if ((flags & tabledefs_1.Tabledefs.METHOD_ATTRIBUTE_VTABLE_LAYOUT_MASK) === tabledefs_1.Tabledefs.METHOD_ATTRIBUTE_REUSE_SLOT) {
                content = content + "override ";
            }
        }
        else if (flags & tabledefs_1.Tabledefs.METHOD_ATTRIBUTE_FINAL) {
            if ((flags & tabledefs_1.Tabledefs.METHOD_ATTRIBUTE_VTABLE_LAYOUT_MASK) === tabledefs_1.Tabledefs.METHOD_ATTRIBUTE_REUSE_SLOT) {
                content = content + "sealed override ";
            }
        }
        else if (flags & tabledefs_1.Tabledefs.METHOD_ATTRIBUTE_VIRTUAL) {
            if ((flags & tabledefs_1.Tabledefs.METHOD_ATTRIBUTE_VTABLE_LAYOUT_MASK) === tabledefs_1.Tabledefs.METHOD_ATTRIBUTE_NEW_SLOT) {
                content = content + "virtual ";
            }
            else {
                content = content + "override ";
            }
        }
        if (flags & tabledefs_1.Tabledefs.METHOD_ATTRIBUTE_PINVOKE_IMPL) {
            content = content + "extern ";
        }
        return content;
    }
};
},{"../Il2CppTypeEnum":7,"../hacker/struct/Il2cppString":8,"../tabledefs":22}],22:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tabledefs = void 0;
//---tabledefs
exports.Tabledefs = {
    TYPE_ATTRIBUTE_SERIALIZABLE: 0x00002000,
    TYPE_ATTRIBUTE_VISIBILITY_MASK: 0x00000007,
    TYPE_ATTRIBUTE_NOT_PUBLIC: 0x00000000,
    TYPE_ATTRIBUTE_PUBLIC: 0x00000001,
    TYPE_ATTRIBUTE_NESTED_PUBLIC: 0x00000002,
    TYPE_ATTRIBUTE_NESTED_PRIVATE: 0x00000003,
    TYPE_ATTRIBUTE_NESTED_FAMILY: 0x00000004,
    TYPE_ATTRIBUTE_NESTED_ASSEMBLY: 0x00000005,
    TYPE_ATTRIBUTE_NESTED_FAM_AND_ASSEM: 0x00000006,
    TYPE_ATTRIBUTE_NESTED_FAM_OR_ASSEM: 0x00000007,
    TYPE_ATTRIBUTE_ABSTRACT: 0x00000080,
    TYPE_ATTRIBUTE_SEALED: 0x00000100,
    TYPE_ATTRIBUTE_SPECIAL_NAME: 0x00000400,
    TYPE_ATTRIBUTE_CLASS_SEMANTIC_MASK: 0x00000020,
    TYPE_ATTRIBUTE_CLASS: 0x00000000,
    TYPE_ATTRIBUTE_INTERFACE: 0x00000020,
    FIELD_ATTRIBUTE_FIELD_ACCESS_MASK: 0x0007,
    FIELD_ATTRIBUTE_COMPILER_CONTROLLED: 0x0000,
    FIELD_ATTRIBUTE_PRIVATE: 0x0001,
    FIELD_ATTRIBUTE_FAM_AND_ASSEM: 0x0002,
    FIELD_ATTRIBUTE_ASSEMBLY: 0x0003,
    FIELD_ATTRIBUTE_FAMILY: 0x0004,
    FIELD_ATTRIBUTE_FAM_OR_ASSEM: 0x0005,
    FIELD_ATTRIBUTE_PUBLIC: 0x0006,
    FIELD_ATTRIBUTE_STATIC: 0x0010,
    FIELD_ATTRIBUTE_INIT_ONLY: 0x0020,
    FIELD_ATTRIBUTE_LITERAL: 0x0040,
    FIELD_ATTRIBUTE_NOT_SERIALIZED: 0x0080,
    FIELD_ATTRIBUTE_SPECIAL_NAME: 0x0200,
    FIELD_ATTRIBUTE_PINVOKE_IMPL: 0x2000,
    /* For runtime use only */
    FIELD_ATTRIBUTE_RESERVED_MASK: 0x9500,
    FIELD_ATTRIBUTE_RT_SPECIAL_NAME: 0x0400,
    FIELD_ATTRIBUTE_HAS_FIELD_MARSHAL: 0x1000,
    FIELD_ATTRIBUTE_HAS_DEFAULT: 0x8000,
    FIELD_ATTRIBUTE_HAS_FIELD_RVA: 0x0100,
    /*
    * Method Attributes (22.1.9)
    */
    METHOD_IMPL_ATTRIBUTE_CODE_TYPE_MASK: 0x0003,
    METHOD_IMPL_ATTRIBUTE_IL: 0x0000,
    METHOD_IMPL_ATTRIBUTE_NATIVE: 0x0001,
    METHOD_IMPL_ATTRIBUTE_OPTIL: 0x0002,
    METHOD_IMPL_ATTRIBUTE_RUNTIME: 0x0003,
    METHOD_IMPL_ATTRIBUTE_MANAGED_MASK: 0x0004,
    METHOD_IMPL_ATTRIBUTE_UNMANAGED: 0x0004,
    METHOD_IMPL_ATTRIBUTE_MANAGED: 0x0000,
    METHOD_IMPL_ATTRIBUTE_FORWARD_REF: 0x0010,
    METHOD_IMPL_ATTRIBUTE_PRESERVE_SIG: 0x0080,
    METHOD_IMPL_ATTRIBUTE_INTERNAL_CALL: 0x1000,
    METHOD_IMPL_ATTRIBUTE_SYNCHRONIZED: 0x0020,
    METHOD_IMPL_ATTRIBUTE_NOINLINING: 0x0008,
    METHOD_IMPL_ATTRIBUTE_MAX_METHOD_IMPL_VAL: 0xffff,
    METHOD_ATTRIBUTE_MEMBER_ACCESS_MASK: 0x0007,
    METHOD_ATTRIBUTE_COMPILER_CONTROLLED: 0x0000,
    METHOD_ATTRIBUTE_PRIVATE: 0x0001,
    METHOD_ATTRIBUTE_FAM_AND_ASSEM: 0x0002,
    METHOD_ATTRIBUTE_ASSEM: 0x0003,
    METHOD_ATTRIBUTE_FAMILY: 0x0004,
    METHOD_ATTRIBUTE_FAM_OR_ASSEM: 0x0005,
    METHOD_ATTRIBUTE_PUBLIC: 0x0006,
    METHOD_ATTRIBUTE_STATIC: 0x0010,
    METHOD_ATTRIBUTE_FINAL: 0x0020,
    METHOD_ATTRIBUTE_VIRTUAL: 0x0040,
    METHOD_ATTRIBUTE_HIDE_BY_SIG: 0x0080,
    METHOD_ATTRIBUTE_VTABLE_LAYOUT_MASK: 0x0100,
    METHOD_ATTRIBUTE_REUSE_SLOT: 0x0000,
    METHOD_ATTRIBUTE_NEW_SLOT: 0x0100,
    METHOD_ATTRIBUTE_STRICT: 0x0200,
    METHOD_ATTRIBUTE_ABSTRACT: 0x0400,
    METHOD_ATTRIBUTE_SPECIAL_NAME: 0x0800,
    METHOD_ATTRIBUTE_PINVOKE_IMPL: 0x2000,
    METHOD_ATTRIBUTE_UNMANAGED_EXPORT: 0x0008,
    /*
     * For runtime use only
     */
    METHOD_ATTRIBUTE_RESERVED_MASK: 0xd000,
    METHOD_ATTRIBUTE_RT_SPECIAL_NAME: 0x1000,
    METHOD_ATTRIBUTE_HAS_SECURITY: 0x4000,
    METHOD_ATTRIBUTE_REQUIRE_SEC_OBJECT: 0x8000,
    //Il2CppMetadataUsage
    kIl2CppMetadataUsageInvalid: 0x0,
    kIl2CppMetadataUsageTypeInfo: 0x1,
    kIl2CppMetadataUsageIl2CppType: 0x2,
    kIl2CppMetadataUsageMethodDef: 0x3,
    kIl2CppMetadataUsageFieldInfo: 0x4,
    kIl2CppMetadataUsageStringLiteral: 0x5,
    kIl2CppMetadataUsageMethodRef: 0x6,
    IL2CPP_TYPE_END: 0x00,
    IL2CPP_TYPE_VOID: 0x01,
    IL2CPP_TYPE_BOOLEAN: 0x02,
    IL2CPP_TYPE_CHAR: 0x03,
    IL2CPP_TYPE_I1: 0x04,
    IL2CPP_TYPE_U1: 0x05,
    IL2CPP_TYPE_I2: 0x06,
    IL2CPP_TYPE_U2: 0x07,
    IL2CPP_TYPE_I4: 0x08,
    IL2CPP_TYPE_U4: 0x09,
    IL2CPP_TYPE_I8: 0x0a,
    IL2CPP_TYPE_U8: 0x0b,
    IL2CPP_TYPE_R4: 0x0c,
    IL2CPP_TYPE_R8: 0x0d,
    IL2CPP_TYPE_STRING: 0x0e,
    IL2CPP_TYPE_PTR: 0x0f,
    IL2CPP_TYPE_BYREF: 0x10,
    IL2CPP_TYPE_VALUETYPE: 0x11,
    IL2CPP_TYPE_CLASS: 0x12,
    IL2CPP_TYPE_VAR: 0x13,
    IL2CPP_TYPE_ARRAY: 0x14,
    IL2CPP_TYPE_GENERICINST: 0x15,
    IL2CPP_TYPE_TYPEDBYREF: 0x16,
    IL2CPP_TYPE_I: 0x18,
    IL2CPP_TYPE_U: 0x19,
    IL2CPP_TYPE_FNPTR: 0x1b,
    IL2CPP_TYPE_OBJECT: 0x1c,
    IL2CPP_TYPE_SZARRAY: 0x1d,
    IL2CPP_TYPE_MVAR: 0x1e,
    IL2CPP_TYPE_CMOD_REQD: 0x1f,
    IL2CPP_TYPE_CMOD_OPT: 0x20,
    IL2CPP_TYPE_INTERNAL: 0x21,
    IL2CPP_TYPE_MODIFIER: 0x40,
    IL2CPP_TYPE_SENTINEL: 0x41,
    IL2CPP_TYPE_PINNED: 0x45,
    IL2CPP_TYPE_ENUM: 0x55
};
},{}],23:[function(require,module,exports){
(function (setImmediate){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const safeSelf_1 = require("./safeSelf");
const dumper_1 = require("./dumper");
setImmediate(main);
function main() {
    // init_array 通用模板的注入
    safeSelf_1.SafeSelf.start();
    dumper_1.dumper.start();
}
}).call(this)}).call(this,require("timers").setImmediate)

},{"./dumper":4,"./safeSelf":27,"timers":29}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IOSUtils = void 0;
exports.IOSUtils = {
    stringToU16Bytes: function (str) {
        var byteArray = [];
        for (var i = 0; i < str.length; i++) {
            var charCode = str.charCodeAt(i);
            byteArray.push(charCode & 0xFF); // 获取低8位
            byteArray.push(0x0);
        }
        return byteArray;
    },
    getDocumentDir: function () {
        let nativePointer = Module.findExportByName(null, "NSSearchPathForDirectoriesInDomains");
        let NSSearchPathForDirectoriesInDomains = new NativeFunction(nativePointer, "pointer", ["int", "int", "int"]);
        var NSDocumentDirectory = 9;
        var NSUserDomainMask = 1;
        var npdirs = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, 1);
        return ObjC.Object(npdirs).objectAtIndex_(0).toString();
    },
};
},{}],25:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkerHelper = void 0;
const logger_1 = require("../logger");
const dumpconfig_1 = require("../dumpconfig");
function resolveLinkerSymbol(moduleName, symbolName) {
    let module = Process.findModuleByName(moduleName);
    let moduleSymbolDetails = module.enumerateSymbols();
    for (let i = 0; i < moduleSymbolDetails.length; i++) {
        if (moduleSymbolDetails[i].name === symbolName) {
            return moduleSymbolDetails[i].address;
        }
    }
    return address;
}
exports.linkerHelper = {
    getIl2CppHandle: function () {
        // linker64 arm64
        const solist_get_headAddr = resolveLinkerSymbol("linker64", '__dl__Z15solist_get_headv');
        const solist_get_somainAddr = resolveLinkerSymbol("linker64", '__dl__Z17solist_get_somainv');
        const solist_get_head = new NativeFunction(solist_get_headAddr, 'pointer', []);
        const solist_get_somain = new NativeFunction(solist_get_somainAddr, 'pointer', []);
        const soinfo_get_realpath = new NativeFunction(resolveLinkerSymbol("linker64", '__dl__ZNK6soinfo12get_realpathEv'), 'pointer', ['pointer']);
        const soinfo_to_handle = new NativeFunction(resolveLinkerSymbol("linker64", '__dl__ZN6soinfo9to_handleEv'), 'pointer', ['pointer']);
        // 调用函数以获取 solist 的头部和 somain
        const solist_head = solist_get_head();
        const somain = solist_get_somain();
        // 创建存储 soinfo_t 对象的数组
        let linker_solist = [];
        // 计算结构体成员 'next' 的偏移量
        let STRUCT_OFFSET_solist_next = 0;
        for (let i = 0; i < 1024 / Process.pointerSize; i++) {
            if (Memory.readPointer(solist_head.add(i * Process.pointerSize)).equals(somain)) {
                STRUCT_OFFSET_solist_next = i * Process.pointerSize;
                break;
            }
        }
        // 根据 'next' 的偏移量遍历链表
        let current = solist_head;
        while (!current.isNull()) {
            linker_solist.push(current);
            current = Memory.readPointer(current.add(STRUCT_OFFSET_solist_next));
        }
        // 打印结果
        console.log(`Found ${linker_solist.length} soinfo_t objects.`);
        let il2cpphandle = null;
        linker_solist.forEach((soinfo, index) => {
            const realpath = soinfo_get_realpath(soinfo);
            // log("realpath " + realpath.readCString());
            if (realpath.readCString().includes(dumpconfig_1.soName)) {
                //转换handle
                const handle = soinfo_to_handle(soinfo);
                (0, logger_1.log)("got il2cpp handle " + handle);
                il2cpphandle = handle;
            }
        });
        return il2cpphandle;
    }
};
},{"../dumpconfig":3,"../logger":26}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogColor = exports.logColor = exports.logHHexLength = exports.logHHex = exports.log4Android = exports.log4AndroidE = exports.log4AndroidW = exports.log4AndroidI = exports.log4AndroidV = exports.log4AndroidD = exports.log = void 0;
const DEBUG = false;
const INTOOLS = false;
function log(msg) {
    if (DEBUG) {
        log4Android(msg);
    }
    else {
        console.log(msg);
    }
}
exports.log = log;
function log4AndroidD(msg, tag) {
    let log = "android.util.Log";
    let log_cls = Java.use(log);
    log_cls.d(tag, msg);
}
exports.log4AndroidD = log4AndroidD;
function log4AndroidV(msg, tag) {
    let log = "android.util.Log";
    let log_cls = Java.use(log);
    log_cls.v(tag, msg);
}
exports.log4AndroidV = log4AndroidV;
function log4AndroidI(msg, tag) {
    let log = "android.util.Log";
    let log_cls = Java.use(log);
    log_cls.i(tag, msg);
}
exports.log4AndroidI = log4AndroidI;
function log4AndroidW(msg, tag) {
    let log = "android.util.Log";
    let log_cls = Java.use(log);
    log_cls.w(tag, msg);
}
exports.log4AndroidW = log4AndroidW;
function log4AndroidE(msg, tag) {
    let log = "android.util.Log";
    let log_cls = Java.use(log);
    log_cls.e(tag, msg);
}
exports.log4AndroidE = log4AndroidE;
function log4Android(msg) {
    let log = "android.util.Log";
    let log_cls = Java.use(log);
    log_cls.w("Dumper", msg);
}
exports.log4Android = log4Android;
function logHHex(pointer) {
    let s = hexdump(pointer, {
        offset: 0,
        length: 64,
        header: true,
        ansi: true
    });
    console.log(s);
}
exports.logHHex = logHHex;
function logHHexLength(pointer, length) {
    console.log(hexdump(pointer, {
        offset: 0,
        length: length,
        header: true,
        ansi: true
    }));
}
exports.logHHexLength = logHHexLength;
function logColor(message, type) {
    if (DEBUG) {
        log4Android(message);
        return;
    }
    if (INTOOLS) {
        log(message);
        return;
    }
    if (type == undefined) {
        log(message);
        return;
    }
    switch (type) {
        case exports.LogColor.WHITE:
            log(message);
            break;
        case exports.LogColor.RED:
            console.error(message);
            break;
        case exports.LogColor.YELLOW:
            console.warn(message);
            break;
        default:
            console.log("\x1b[" + type + "m" + message + "\x1b[0m");
            break;
    }
}
exports.logColor = logColor;
exports.LogColor = {
    WHITE: 0,
    RED: 1,
    YELLOW: 3,
    C31: 31,
    C32: 32,
    C33: 33,
    C34: 34,
    C35: 35,
    C36: 36,
    C41: 41,
    C42: 42,
    C43: 43,
    C44: 44,
    C45: 45,
    C46: 46,
    C90: 90,
    C91: 91,
    C92: 92,
    C93: 93,
    C94: 94,
    C95: 95,
    C96: 96,
    C97: 97,
    C100: 100,
    C101: 101,
    C102: 102,
    C103: 103,
    C104: 104,
    C105: 105,
    C106: 106,
    C107: 107
};
},{}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafeSelf = void 0;
exports.SafeSelf = {
    start: function () {
        let connect = Module.findExportByName(null, "connect");
        if (connect != null) {
            Interceptor.attach(connect, {
                onEnter: function (args) {
                    let arg = args[1];
                    let port = arg.add(0x2).readUShort();
                    if (port === 41577
                        || port === 35421) {
                        //写值
                        // logHHex(arg)
                        arg.add(0x2).writeUShort(26151);
                    }
                }
            });
        }
    }
};
},{}],28:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],29:[function(require,module,exports){
(function (setImmediate,clearImmediate){(function (){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this)}).call(this,require("timers").setImmediate,require("timers").clearImmediate)

},{"process/browser.js":28,"timers":29}]},{},[23])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZ2VudC9hbmQvWmlwVXRpbHMuanMiLCJhZ2VudC9jb25maWcuanMiLCJhZ2VudC9kdW1wY29uZmlnLmpzIiwiYWdlbnQvZHVtcGVyLmpzIiwiYWdlbnQvaWwyY3BwL0NTRmlsZU91dC5qcyIsImFnZW50L2lsMmNwcC9GaWxlVXRpbHMuanMiLCJhZ2VudC9pbDJjcHAvSWwyQ3BwVHlwZUVudW0uanMiLCJhZ2VudC9pbDJjcHAvaGFja2VyL3N0cnVjdC9JbDJjcHBTdHJpbmcuanMiLCJhZ2VudC9pbDJjcHAvaWwyY3BwQXBpLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9JbDJDcHBDbGFzcy5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvSWwyQ3BwRmllbGRJbmZvLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9JbDJDcHBHZW5lcmljQ29udGV4dC5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvSWwyQ3BwR2VuZXJpY0luc3QuanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L0lsMkNwcEdlbmVyaWNNZXRob2QuanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L0lsMkNwcEltYWdlLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9JbDJDcHBQcm9wZXJ0eUluZm8uanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L0lsMkNwcFR5cGUuanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L01ldGhvZEluZm8uanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L05hdGl2ZVN0cnVjdC5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3Qvc3RydWN0SXRlbS5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvdXRpbHMuanMiLCJhZ2VudC9pbDJjcHAvdGFibGVkZWZzLmpzIiwiYWdlbnQvaW5kZXgudHMiLCJhZ2VudC9pb3MvSU9TVXRpbHMuanMiLCJhZ2VudC9saW5rZXIvTGlua2VySGVscGVyLmpzIiwiYWdlbnQvbG9nZ2VyLnRzIiwiYWdlbnQvc2FmZVNlbGYuanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3RpbWVycy1icm93c2VyaWZ5L21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7QUNBVyxRQUFBLFFBQVEsR0FBRztJQUVsQixJQUFJLEVBQUU7UUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLHdDQUF3QyxFQUFFLDRDQUE0QyxDQUFDLENBQUE7SUFDeEcsQ0FBQztJQUVELFNBQVMsRUFBRSxVQUFVLFVBQVUsRUFBRSxVQUFVLEVBQUMsUUFBUTtRQUNoRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7WUFDaEIsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQzFDLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUM7Z0JBQzlCLGVBQWU7Z0JBQ2YsSUFBSSxFQUFFLHlCQUF5QjtnQkFDL0IsVUFBVSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO2dCQUM1QyxPQUFPLEVBQUU7b0JBQ0wsR0FBRyxFQUFFO3dCQUNELElBQUksZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO3dCQUM1RCxJQUFJLGVBQWUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLCtCQUErQixDQUFDLENBQUM7d0JBQ2hFLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQzt3QkFDbEQsSUFBSSxlQUFlLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO3dCQUMxRCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO3dCQUVwQyxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7d0JBQ25CLElBQUksY0FBYyxHQUFHLENBQUMsQ0FBQzt3QkFFdkIsSUFBSSxHQUFH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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIifQ==
