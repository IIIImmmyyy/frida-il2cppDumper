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
            if (il2cppApi_1.il2cppApi.nativeFunNotExistMap.size > 0) {
                (0, logger_1.log)("some NativeFun is un exist ,parser will be not accurate :");
                il2cppApi_1.il2cppApi.nativeFunNotExistMap.forEach(function (value, key) {
                    (0, logger_1.log)(key + "");
                });
            }
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
        classAllCount = classAllCount + class_count;
        (0, logger_1.log)("findAllClass " + il2cppImage.name() + "  class_count:" + class_count);
        for (let i = 0; i < class_count; i++) {
            (0, logger_1.log)("class process:" + i + "/" + class_count);
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
                if (flags & tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_LITERAL) {
                    if (!enumType) {
                        out += "const ";
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
},{"./and/ZipUtils":1,"./dumpconfig":3,"./il2cpp/CSFileOut":5,"./il2cpp/Il2CppTypeEnum":7,"./il2cpp/il2cppApi":8,"./il2cpp/struct/utils":20,"./il2cpp/tabledefs":21,"./ios/IOSUtils":23,"./logger":25}],5:[function(require,module,exports){
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
},{"../dumpconfig":3,"./FileUtils":6,"./il2cppApi":8}],6:[function(require,module,exports){
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
},{"../logger":25}],7:[function(require,module,exports){
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
},{"../dumpconfig":3,"../linker/LinkerHelper":24,"./struct/Il2CppClass":9,"./struct/Il2CppFieldInfo":10,"./struct/Il2CppImage":14,"./struct/Il2CppPropertyInfo":15,"./struct/Il2CppType":16,"./struct/MethodInfo":17}],9:[function(require,module,exports){
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
},{"../il2cppApi":8,"./Il2CppImage":14,"./NativeStruct":18}],10:[function(require,module,exports){
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
},{"../il2cppApi":8,"./Il2CppClass":9,"./NativeStruct":18,"./utils":20}],11:[function(require,module,exports){
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
},{"./Il2CppGenericInst":12,"./NativeStruct":18}],12:[function(require,module,exports){
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
},{"./NativeStruct":18}],13:[function(require,module,exports){
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
},{"./Il2CppGenericContext":11,"./NativeStruct":18}],14:[function(require,module,exports){
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
},{"../../dumpconfig":3,"../il2cppApi":8,"./NativeStruct":18,"./structItem":19}],15:[function(require,module,exports){
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
},{"../il2cppApi":8,"./NativeStruct":18}],16:[function(require,module,exports){
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
},{"../../logger":25,"../il2cppApi":8,"./NativeStruct":18}],17:[function(require,module,exports){
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
},{"../../config":2,"../../logger":25,"../il2cppApi":8,"./Il2CppClass":9,"./Il2CppGenericMethod":13,"./NativeStruct":18}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeStruct = void 0;
class NativeStruct extends NativePointer {
    constructor(pointer) {
        super(pointer);
    }
}
exports.NativeStruct = NativeStruct;
},{}],19:[function(require,module,exports){
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
},{}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.utils = void 0;
const Il2CppTypeEnum_1 = require("../Il2CppTypeEnum");
const tabledefs_1 = require("../tabledefs");
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
            default:
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
},{"../Il2CppTypeEnum":7,"../tabledefs":21}],21:[function(require,module,exports){
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
},{}],22:[function(require,module,exports){
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
    // linkerHelper.getSoList();
}
}).call(this)}).call(this,require("timers").setImmediate)

},{"./dumper":4,"./safeSelf":26,"timers":28}],23:[function(require,module,exports){
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
},{}],24:[function(require,module,exports){
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
},{"../dumpconfig":3,"../logger":25}],25:[function(require,module,exports){
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
},{}],26:[function(require,module,exports){
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
},{}],27:[function(require,module,exports){
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

},{}],28:[function(require,module,exports){
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

},{"process/browser.js":27,"timers":28}]},{},[22])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZ2VudC9hbmQvWmlwVXRpbHMuanMiLCJhZ2VudC9jb25maWcuanMiLCJhZ2VudC9kdW1wY29uZmlnLmpzIiwiYWdlbnQvZHVtcGVyLmpzIiwiYWdlbnQvaWwyY3BwL0NTRmlsZU91dC5qcyIsImFnZW50L2lsMmNwcC9GaWxlVXRpbHMuanMiLCJhZ2VudC9pbDJjcHAvSWwyQ3BwVHlwZUVudW0uanMiLCJhZ2VudC9pbDJjcHAvaWwyY3BwQXBpLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9JbDJDcHBDbGFzcy5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvSWwyQ3BwRmllbGRJbmZvLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9JbDJDcHBHZW5lcmljQ29udGV4dC5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvSWwyQ3BwR2VuZXJpY0luc3QuanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L0lsMkNwcEdlbmVyaWNNZXRob2QuanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L0lsMkNwcEltYWdlLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9JbDJDcHBQcm9wZXJ0eUluZm8uanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L0lsMkNwcFR5cGUuanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L01ldGhvZEluZm8uanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L05hdGl2ZVN0cnVjdC5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3Qvc3RydWN0SXRlbS5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvdXRpbHMuanMiLCJhZ2VudC9pbDJjcHAvdGFibGVkZWZzLmpzIiwiYWdlbnQvaW5kZXgudHMiLCJhZ2VudC9pb3MvSU9TVXRpbHMuanMiLCJhZ2VudC9saW5rZXIvTGlua2VySGVscGVyLmpzIiwiYWdlbnQvbG9nZ2VyLnRzIiwiYWdlbnQvc2FmZVNlbGYuanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2Vy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QUFXLENBQUMsS0FBSyxDQUFDLENBQUM7cUJBRW5DO2dCQUdMLENBQUM7YUFDSixDQUFDLENBQUE7U0FDTDtJQUVMLENBQUM7Q0FDSixDQUFBOztBQ3pCRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiJ9
