(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoName = void 0;
exports.SoName = "libil2cpp.so";
},{}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSoInfo = exports.CSFileDir = exports.OutCSFile = exports.DUMP_FILE_PATH = exports.path = exports.soName = exports.UNITY_VER = exports.UnityVer = exports.pkg_name = void 0;
exports.pkg_name = "com.bf.sgs.hdexp";
exports.UnityVer = {
    V_2017_4_31f1: "2017.4.31f1",
    V_2018_4_36f1: "2018.4.36f1",
    V_2020: "2020",
};
exports.UNITY_VER = exports.UnityVer.V_2018_4_36f1;
exports.soName = "UnityFramework";
exports.path = "/data/data/" + exports.pkg_name;
exports.DUMP_FILE_PATH = exports.path + "/dump.cs";
exports.OutCSFile = true;
exports.CSFileDir = "/data/data/" + exports.pkg_name + "/files/Script";
exports.useSoInfo = false;
},{}],3:[function(require,module,exports){
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
let classAllCount = 0;
console.log("platform:" + Process.platform);
let file;
if (Process.platform === "darwin") {
    let documentDir = IOSUtils_1.IOSUtils.getDocumentDir();
    file = new File(documentDir + "/dump.cs", "wb");
}
else {
    file = new File(dumpconfig_1.DUMP_FILE_PATH, "wb");
}
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
                continue;
            }
            if (!method.isNull()) {
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
        file.write(string);
        file.flush();
    }
};
},{"./dumpconfig":2,"./il2cpp/CSFileOut":4,"./il2cpp/Il2CppTypeEnum":6,"./il2cpp/il2cppApi":7,"./il2cpp/struct/utils":19,"./il2cpp/tabledefs":20,"./ios/IOSUtils":22,"./logger":24}],4:[function(require,module,exports){
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
},{"../dumpconfig":2,"./FileUtils":5,"./il2cppApi":7}],5:[function(require,module,exports){
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
},{"../logger":24}],6:[function(require,module,exports){
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
},{}],7:[function(require,module,exports){
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
},{"../dumpconfig":2,"../linker/LinkerHelper":23,"./struct/Il2CppClass":8,"./struct/Il2CppFieldInfo":9,"./struct/Il2CppImage":13,"./struct/Il2CppPropertyInfo":14,"./struct/Il2CppType":15,"./struct/MethodInfo":16}],8:[function(require,module,exports){
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
},{"../il2cppApi":7,"./Il2CppImage":13,"./NativeStruct":17}],9:[function(require,module,exports){
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
},{"../il2cppApi":7,"./Il2CppClass":8,"./NativeStruct":17,"./utils":19}],10:[function(require,module,exports){
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
},{"./Il2CppGenericInst":11,"./NativeStruct":17}],11:[function(require,module,exports){
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
},{"./NativeStruct":17}],12:[function(require,module,exports){
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
},{"./Il2CppGenericContext":10,"./NativeStruct":17}],13:[function(require,module,exports){
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
},{"../../dumpconfig":2,"../il2cppApi":7,"./NativeStruct":17,"./structItem":18}],14:[function(require,module,exports){
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
},{"../il2cppApi":7,"./NativeStruct":17}],15:[function(require,module,exports){
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
},{"../../logger":24,"../il2cppApi":7,"./NativeStruct":17}],16:[function(require,module,exports){
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
},{"../../config":1,"../../logger":24,"../il2cppApi":7,"./Il2CppClass":8,"./Il2CppGenericMethod":12,"./NativeStruct":17}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeStruct = void 0;
class NativeStruct extends NativePointer {
    constructor(pointer) {
        super(pointer);
    }
}
exports.NativeStruct = NativeStruct;
},{}],18:[function(require,module,exports){
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
},{}],19:[function(require,module,exports){
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
},{"../Il2CppTypeEnum":6,"../tabledefs":20}],20:[function(require,module,exports){
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
},{}],21:[function(require,module,exports){
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

},{"./dumper":3,"./safeSelf":25,"timers":27}],22:[function(require,module,exports){
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
},{}],23:[function(require,module,exports){
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
},{"../dumpconfig":2,"../logger":24}],24:[function(require,module,exports){
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
},{}],25:[function(require,module,exports){
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
},{}],26:[function(require,module,exports){
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

},{}],27:[function(require,module,exports){
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

},{"process/browser.js":26,"timers":27}]},{},[21])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZ2VudC9jb25maWcuanMiLCJhZ2VudC9kdW1wY29uZmlnLmpzIiwiYWdlbnQvZHVtcGVyLmpzIiwiYWdlbnQvaWwyY3BwL0NTRmlsZU91dC5qcyIsImFnZW50L2lsMmNwcC9GaWxlVXRpbHMuanMiLCJhZ2VudC9pbDJjcHAvSWwyQ3BwVHlwZUVudW0uanMiLCJhZ2VudC9pbDJjcHAvaWwyY3BwQXBpLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9JbDJDcHBDbGFzcy5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvSWwyQ3BwRmllbGRJbmZvLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9JbDJDcHBHZW5lcmljQ29udGV4dC5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvSWwyQ3BwR2VuZXJpY0luc3QuanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L0lsMkNwcEdlbmVyaWNNZXRob2QuanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L0lsMkNwcEltYWdlLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9JbDJDcHBQcm9wZXJ0eUluZm8uanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L0lsMkNwcFR5cGUuanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L01ldGhvZEluZm8uanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L05hdGl2ZVN0cnVjdC5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3Qvc3RydWN0SXRlbS5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvdXRpbHMuanMiLCJhZ2VudC9pbDJjcHAvdGFibGVkZWZzLmpzIiwiYWdlbnQvaW5kZXgudHMiLCJhZ2VudC9pb3MvSU9TVXRpbHMuanMiLCJhZ2VudC9saW5rZXIvTGlua2VySGVscGVyLmpzIiwiYWdlbnQvbG9nZ2VyLnRzIiwiYWdlbnQvc2FmZVNlbGYuanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3RpbWVy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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIn0=
