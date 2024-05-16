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
exports.pkg_name = "com.tencent.sqsd";
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
                exports.dumper.out(" // Image :" + i + " " + Il2CppImage.nameNoExt() + " - " + Il2CppImage.typeStart() + "\n");
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
                if (klass.name() === "JSONNode") {
                    continue;
                }
                let methodModifier = utils_1.utils.get_method_modifier(method.getFlags());
                // let methodPointer = method.getMethodPointer()
                // log("methodModifier:" + methodModifier + " methodPointer:" + methodPointer);
                out += methodModifier;
                pro_class = il2cppApi_1.il2cppApi.il2cpp_class_from_type(method.getReturnType());
            }
            else if (!setMethod.isNull()) {
                let setModifier = utils_1.utils.get_method_modifier(setMethod.getFlags());
                out += setModifier;
                pro_class = il2cppApi_1.il2cppApi.il2cpp_class_from_type(setMethod.getReturnType());
            }
            // log("pro_class:"+pro_class +"propertyInfo:"+propertyInfo.getName() +" method:"+method +" setMethod:"+setMethod)
            out += exports.dumper.parserType(pro_class.getType()) + " " + propertyInfo.getName() + " { ";
            if (!method.isNull()) {
                out += "get; ";
            }
            if (!setMethod.isNull()) {
                out += "set; ";
            }
            out += "}\n";
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
class Il2CppImage extends NativeStruct_1.NativeStruct {
    name() {
        return il2cppApi_1.il2cppApi.il2cpp_image_get_name(this).readCString();
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
    // hooklinker.start();
    dumper_1.dumper.start();
    // XLuaFind.XLuaDump(0x3C35A60,1000);
    // linkerHelper.getSoList();
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
const INTOOLS = true;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZ2VudC9hbmQvWmlwVXRpbHMuanMiLCJhZ2VudC9jb25maWcuanMiLCJhZ2VudC9kdW1wY29uZmlnLmpzIiwiYWdlbnQvZHVtcGVyLmpzIiwiYWdlbnQvaWwyY3BwL0NTRmlsZU91dC5qcyIsImFnZW50L2lsMmNwcC9GaWxlVXRpbHMuanMiLCJhZ2VudC9pbDJjcHAvSWwyQ3BwVHlwZUVudW0uanMiLCJhZ2VudC9pbDJjcHAvaGFja2VyL3N0cnVjdC9JbDJjcHBTdHJpbmcuanMiLCJhZ2VudC9pbDJjcHAvaWwyY3BwQXBpLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9JbDJDcHBDbGFzcy5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvSWwyQ3BwRmllbGRJbmZvLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9JbDJDcHBHZW5lcmljQ29udGV4dC5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvSWwyQ3BwR2VuZXJpY0luc3QuanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L0lsMkNwcEdlbmVyaWNNZXRob2QuanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L0lsMkNwcEltYWdlLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9JbDJDcHBQcm9wZXJ0eUluZm8uanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L0lsMkNwcFR5cGUuanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L01ldGhvZEluZm8uanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L05hdGl2ZVN0cnVjdC5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3Qvc3RydWN0SXRlbS5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvdXRpbHMuanMiLCJhZ2VudC9pbDJjcHAvdGFibGVkZWZzLmpzIiwiYWdlbnQvaW5kZXgudHMiLCJhZ2VudC9pb3MvSU9TVXRpbHMuanMiLCJhZ2VudC9saW5rZXIvTGlua2VySGVscGVyLmpzIiwiYWdlbnQvbG9nZ2VyLnRzIiwiYWdlbnQvc2FmZVNlbGYuanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3RpbWVycy1icm93c2VyaWZ5L21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7QUNBVyxRQUFBLFFBQVEsR0FBRztJQUVsQixJQUFJLEVBQUU7UUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLHdDQUF3QyxFQUFFLDRDQUE0QyxDQUFDLENBQUE7SUFDeEcsQ0FBQztJQUVELFNBQVMsRUFBRSxVQUFVLFVBQVUsRUFBRSxVQUFVLEVBQUMsUUFBUTtRQUNoRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7WUFDaEIsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQzFDLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUM7Z0JBQzlCLGVBQWU7Z0JBQ2YsSUFBSSxFQUFFLHlCQUF5QjtnQkFDL0IsVUFBVSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO2dCQUM1QyxPQUFPLEVBQUU7b0JBQ0wsR0FBRyxFQUFFO3dCQUNELElBQUksZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO3dCQUM1RCxJQUFJLGVBQWUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLCtCQUErQixDQUFDLENBQUM7d0JBQ2hFLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQzt3QkFDbEQsSUFBSSxlQUFlLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO3dCQUMxRCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO3dCQUVwQyxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7d0JBQ25CLElBQUksY0FBYyxHQUFHLENBQUMsQ0FBQzt3QkFFdkIsSUFBSSxHQUFH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RTt3QkFDbkIsSUFBSTt3QkFDSixlQUFlO3dCQUNmLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO3FCQUVuQztnQkFHTCxDQUFDO2FBQ0osQ0FBQyxDQUFBO1NBQ0w7SUFFTCxDQUFDO0NBQ0osQ0FBQTs7QUN6QkQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIifQ==
