(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_NOT_EXIT = exports.path = exports.FromTypeDefinition_Addr = exports.UNITY_VER = exports.pkg_name = exports.soName = exports.UnityVer = void 0;
exports.UnityVer = {
    V_2017_4_31f1: "2017.4.31f1",
    V_2018_4_36f1: "2018.4.36f1",
};
exports.soName = "libil2cpp.so";
exports.pkg_name = "com.xx.xx";
exports.UNITY_VER = exports.UnityVer.V_2018_4_36f1;
exports.FromTypeDefinition_Addr = undefined; //通过IDA 计算得到 只有Unity2017.3.版本需要手动计算2018版本不需要
exports.path = "/data/data/" + exports.pkg_name + "/dump.cs";
exports.API_NOT_EXIT = -1001;
},{}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dumper = void 0;
const il2cppApi_1 = require("./il2cpp/il2cppApi");
const logger_1 = require("./logger");
const config_1 = require("./config");
const tabledefs_1 = require("./il2cpp/tabledefs");
const Il2CppTypeEnum_1 = require("./il2cpp/Il2CppTypeEnum");
const utils_1 = require("./il2cpp/struct/utils");
let file = new File(config_1.path, "wb");
exports.dumper = {
    start: function () {
        let domain = il2cppApi_1.il2cppApi.il2cpp_domain_get();
        let size_t = Memory.alloc(Process.pointerSize);
        let assemblies = il2cppApi_1.il2cppApi.il2cpp_domain_get_assemblies(domain, size_t);
        let assemblies_count = size_t.readInt();
        (0, logger_1.log)("assemblies_count:" + assemblies_count);
        let il2CppImageArray = new Array();
        for (let i = 0; i < assemblies_count; i++) {
            let assembly = assemblies.add(Process.pointerSize * i).readPointer();
            let Il2CppImage = il2cppApi_1.il2cppApi.il2cpp_assembly_get_image(assembly);
            let typeStart = Il2CppImage.typeStart();
            // log("typeStart:"+typeStart +" name:"+Il2CppImage.nameNoExt());
            this.out(" // Image :" + i + " " + Il2CppImage.nameNoExt() + " - " + Il2CppImage.typeStart() + "\n");
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
            this.out("\n//assembly Image -->:" + nameNoExt + "    startIndex:" + start + "   typeCount:" + class_count);
            this.findAllClass(Il2CppImage);
            // }
        }
        (0, logger_1.log)("dump end");
        // log("nativeFunNotExistMap:" + il2cppApi.nativeFunNotExistMap.size);
        if (il2cppApi_1.il2cppApi.nativeFunNotExistMap.size > 0) {
            (0, logger_1.log)("in Unity: " + config_1.UNITY_VER + "  some NativeFun is un exist ,parser will be not accurate :");
            il2cppApi_1.il2cppApi.nativeFunNotExistMap.forEach(function (value, key) {
                (0, logger_1.log)(key + "");
            });
        }
    },
    findAllClass: function (il2cppImage) {
        let class_count = il2cppImage.typeCount();
        // log("findAllClass class_count:" + class_count)
        for (let i = 0; i < class_count; i++) {
            let il2CppClass = il2cppImage.getClass(i);
            let il2CppType = il2CppClass.getType();
            this.dumpType(il2CppType);
        }
    },
    dumpType: function (il2CppType) {
        let klass = il2cppApi_1.il2cppApi.il2cpp_class_from_type(il2CppType);
        this.out("\n//Namespace：" + klass.namespaze() + "\n");
        let flags = klass.flags();
        let Serializable = flags & tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_SERIALIZABLE;
        if (Serializable) {
            this.out('[Serializable]\n');
        }
        let visibility = flags & tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_VISIBILITY_MASK;
        switch (visibility) {
            case tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_PUBLIC:
            case tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_NESTED_PUBLIC:
                this.out("public ");
                break;
            case tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_NOT_PUBLIC:
            case tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_NESTED_FAM_AND_ASSEM:
            case tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_NESTED_ASSEMBLY:
                this.out("internal ");
                break;
            case tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_NESTED_PRIVATE:
                this.out("private ");
                break;
            case tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_NESTED_FAMILY:
                this.out("protected ");
                break;
            case tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_NESTED_FAM_OR_ASSEM:
                this.out("protected internal ");
                break;
        }
        let isValuetype = klass.valueType();
        let IsEnum = klass.enumType();
        if (flags & tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_ABSTRACT && flags & tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_SEALED) {
            this.out("static ");
        }
        else if (!(flags & tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_INTERFACE) && flags & tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_ABSTRACT) {
            this.out("abstract ");
        }
        else if (!isValuetype && !IsEnum && flags & tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_SEALED) {
            this.out("sealed ");
        }
        if (flags & tabledefs_1.Tabledefs.TYPE_ATTRIBUTE_INTERFACE) {
            this.out("interface ");
        }
        else if (IsEnum) {
            this.out("enum ");
        }
        else if (isValuetype) {
            this.out("struct ");
        }
        else {
            this.out("class ");
        }
        let name = klass.name();
        //获取泛型
        if (name.indexOf("`") !== -1) {
            let split = name.split("`");
            name = split[0];
            name = name + klass.getGenericName();
        }
        this.out(name + " ");
        let klass_parent = klass.parent();
        //父类
        let hasParent = false;
        if (!isValuetype && !IsEnum && !klass_parent.isNull()) {
            let parent_cls_type = klass_parent.getType();
            let typeEnum = parent_cls_type.getTypeEnum();
            if (typeEnum === Il2CppTypeEnum_1.Il2CppTypeEnum.IL2CPP_TYPE_OBJECT) {
                //not out
            }
            else {
                hasParent = true;
                this.out(": " + klass_parent.name());
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
                this.out(": " + interfaces_name);
                hasParent = true;
            }
            else {
                this.out(", " + interfaces_name);
            }
        }
        this.out("\n{\n");
        this.dumpFiled(klass);
        this.dumpPropertyInfo(klass);
        this.dumpMethod(klass);
        this.out("\n}");
    },
    dumpMethod: function (klass) {
        let iter = Memory.alloc(Process.pointerSize);
        let methodInfo;
        let isFirst = true;
        let baseAddr = Module.findBaseAddress(config_1.soName);
        while (!(methodInfo = klass.getMethods(iter)).isNull()) {
            if (isFirst) {
                this.out("\n\t//methods\n");
                isFirst = false;
            }
            let methodPointer = methodInfo.getMethodPointer();
            if (!methodPointer.isNull()) {
                let number = methodPointer - baseAddr;
                this.out("\t// RVA: 0x" + number.toString(16).toUpperCase());
                this.out("  VA: 0x");
                this.out(methodPointer.toString(16).toUpperCase());
                // log("methodPointer:"+methodPointer +"number:"+number.toString(16).toUpperCase());
                // this.out.outPut << std::hex << (uint64_t) method->methodPointer - il2cpp_base;
            }
            else {
                this.out("\t// RVA: 0x  VA: 0x0");
            }
            // log("slot:" + methodInfo.getSlot());
            if (methodInfo.getSlot() !== 65535) {
                this.out(" Slot: " + methodInfo.getSlot());
            }
            this.out("\n\t");
            let methodModifier = utils_1.utils.get_method_modifier(methodInfo.getFlags());
            this.out(methodModifier);
            let returnType = methodInfo.getReturnType();
            let typeEnum = returnType.getTypeEnum();
            // log("returnType typeEnum:"+typeEnum);
            // if (returnType.byref()){
            //     this.out("ref ");
            // }
            let return_cls = il2cppApi_1.il2cppApi.il2cpp_class_from_type(returnType);
            this.out(return_cls.name() + " " + methodInfo.name() + "(");
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
                    this.out(name + " " + methodInfo.getParamName(i));
                    if (i + 1 !== paramCount) {
                        this.out(", ");
                    }
                    else {
                        this.out(") { }\n");
                    }
                }
            }
            else {
                this.out("){ }\n");
            }
        }
    },
    dumpPropertyInfo: function (klass) {
        let iter = Memory.alloc(Process.pointerSize);
        let propertyInfo;
        let isFirst = true;
        while (!(propertyInfo = klass.getProperties(iter)).isNull()) {
            if (isFirst) {
                this.out("\n\t// Properties\n");
                isFirst = false;
            }
            this.out("\t");
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
                let methodPointer = method.getMethodPointer();
                (0, logger_1.log)("methodModifier:" + methodModifier + " methodPointer:" + methodPointer);
                this.out(methodModifier);
                pro_class = il2cppApi_1.il2cppApi.il2cpp_class_from_type(method.getReturnType());
            }
            else if (!setMethod.isNull()) {
                let setModifier = utils_1.utils.get_method_modifier(setMethod.getFlags());
                this.out(setModifier);
                pro_class = il2cppApi_1.il2cppApi.il2cpp_class_from_type(setMethod.getReturnType());
            }
            (0, logger_1.log)("pro_class:" + pro_class + "propertyInfo:" + propertyInfo.getName() + " method:" + method + " setMethod:" + setMethod);
            this.out(pro_class.name() + " " + propertyInfo.getName() + " { ");
            if (!method.isNull()) {
                this.out("get; ");
            }
            if (!setMethod.isNull()) {
                this.out("set; ");
            }
            this.out("}\n");
        }
    },
    dumpFiled: function (klass) {
        // log("dumpFiled class :" + klass.name())
        let filedCount = klass.filedCount();
        // log("fieldCount:" + filedCount);
        if (filedCount > 0) {
            let iter = Memory.alloc(Process.pointerSize);
            let filedInfo;
            this.out("\t//Fileds\n");
            while (!(filedInfo = klass.getFieldsInfo(iter)).isNull()) {
                let flags = filedInfo.getFlags();
                this.out("\t");
                let access = flags & tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_FIELD_ACCESS_MASK;
                switch (access) {
                    case tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_PRIVATE:
                        this.out("private ");
                        break;
                    case tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_PUBLIC:
                        this.out("public ");
                        break;
                    case tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_FAMILY:
                        this.out("protected ");
                        break;
                    case tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_ASSEMBLY:
                    case tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_FAM_AND_ASSEM:
                        this.out("internal ");
                        break;
                    case tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_FAM_OR_ASSEM:
                        this.out("protected internal ");
                        break;
                }
                if (flags & tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_LITERAL) {
                    this.out("const ");
                }
                else {
                    if (flags & tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_STATIC) {
                        this.out("static ");
                    }
                    if (flags & tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_INIT_ONLY) {
                        this.out("readonly ");
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
                this.out(name + " " + filedInfo.getFiledName());
                //获取常量的初始值
                // let filed_info_cpp_type = filedInfo.getType(); //获取变量参数类型
                // log("filed_info_cpp_type:" + filed_info_cpp_type.getTypeEnum() + name + " " + filedInfo.getFiledName());
                if (flags & tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_LITERAL) {
                    let staticValue = filedInfo.getStaticValue();
                    if (staticValue !== null) {
                        this.out(" = " + staticValue + ";\n");
                    }
                }
                else {
                    this.out(" ;// 0x" + offset.toString(16).toUpperCase() + "\n");
                }
            }
        }
    },
    out: function (string) {
        file.write(string);
        file.flush();
    }
};
},{"./config":1,"./il2cpp/Il2CppTypeEnum":3,"./il2cpp/il2cppApi":4,"./il2cpp/struct/utils":13,"./il2cpp/tabledefs":14,"./logger":16}],3:[function(require,module,exports){
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
},{}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.il2cppApi = void 0;
const config_1 = require("../config");
const Il2CppImage_1 = require("./struct/Il2CppImage");
const Il2CppClass_1 = require("./struct/Il2CppClass");
const Il2CppType_1 = require("./struct/Il2CppType");
const Il2CppFieldInfo_1 = require("./struct/Il2CppFieldInfo");
const Il2CppPropertyInfo_1 = require("./struct/Il2CppPropertyInfo");
const MethodInfo_1 = require("./struct/MethodInfo");
let nativeFunMap = new Map();
exports.il2cppApi = {
    nativeFunNotExistMap: new Map(),
    il2cpp_domain_get: function () {
        return this.load("il2cpp_domain_get", 'pointer', []);
    },
    il2cpp_domain_get_assemblies: function (il2Cppdomain, size_t) {
        let il2cpp_domain_get_assemblies = this.load("il2cpp_domain_get_assemblies", 'pointer', ['pointer', 'pointer']);
        return il2cpp_domain_get_assemblies(il2Cppdomain, size_t);
    },
    il2cpp_assembly_get_image: function (il2Cppassembly) {
        let il2cpp_assembly_get_image = this.load("il2cpp_assembly_get_image", 'pointer', ['pointer']);
        return new Il2CppImage_1.Il2CppImage(il2cpp_assembly_get_image(il2Cppassembly));
    },
    il2cpp_image_get_class_count: function (image) {
        // size_t il2cpp_image_get_class_count(const Il2CppImage * image)
        let il2cpp_image_get_class_count = this.load("il2cpp_image_get_class_count", "pointer", ['pointer']);
        if (il2cpp_image_get_class_count !== undefined) {
            il2cpp_image_get_class_count(image).toUInt32();
        }
        return image.getOffsetTypeCount();
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
        return new Il2CppClass_1.Il2CppClass(il2cpp_class_from_type(Il2CppType));
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
    il2cpp_type_get_object: function (Il2CppType) {
        let il2cpp_type_get_object = this.load("il2cpp_type_get_object", 'pointer', ['pointer']);
        return il2cpp_type_get_object(Il2CppType);
    },
    il2cpp_type_get_name: function (Il2CppType) {
        let il2cpp_type_get_name = this.load("il2cpp_type_get_name", 'pointer', ['pointer']);
        return il2cpp_type_get_name(Il2CppType);
    },
    il2cpp_field_static_get_value: function (FieldInfo, value) {
        let il2cpp_field_static_get_value = this.load("il2cpp_field_static_get_value", 'void', ['pointer', 'pointer']);
        return il2cpp_field_static_get_value(FieldInfo, value);
    },
    il2cpp_field_get_parent: function (FieldInfo) {
        let il2cpp_field_get_parent = this.load("il2cpp_field_get_parent", 'void', ['pointer', 'pointer']);
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
        let il2cpp_method_get_flags = this.load("il2cpp_method_get_flags", "uint32", ['pointer', 'uint32']);
        return il2cpp_method_get_flags(method, iflags);
    },
    il2cpp_method_get_name: function (method) {
        let il2cpp_method_get_name = this.load("il2cpp_method_get_name", "pointer", ['pointer']);
        return il2cpp_method_get_name(method);
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
        // new NativeFunction(Module.findExportByName(soName, "il2cpp_domain_get"), 'pointer', []);
        let cacheFun = nativeFunMap.get(exportName);
        if (cacheFun == null) {
            let isExist = this.nativeFunNotExistMap.get(exportName);
            if (isExist === -1) {
                return undefined;
            }
            let nativePointer = Module.findExportByName(config_1.soName, exportName);
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
};
},{"../config":1,"./struct/Il2CppClass":5,"./struct/Il2CppFieldInfo":6,"./struct/Il2CppImage":7,"./struct/Il2CppPropertyInfo":8,"./struct/Il2CppType":9,"./struct/MethodInfo":10}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Il2CppClass = void 0;
const NativeStruct_1 = require("./NativeStruct");
const il2cppApi_1 = require("../il2cppApi");
class Il2CppClass extends NativeStruct_1.NativeStruct {
    name() {
        return il2cppApi_1.il2cppApi.il2cpp_class_get_name(this).readCString();
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
        let il2cppTypeGetName = type.getName();
        let name = this.name();
        if (name.indexOf("`") !== -1) {
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
        return "";
    }
    parent() {
        return new Il2CppClass(il2cppApi_1.il2cppApi.il2cpp_class_get_parent(this));
    }
    getInterfaces(iter) {
        return il2cppApi_1.il2cppApi.il2cpp_class_get_interfaces(this, iter);
    }
}
exports.Il2CppClass = Il2CppClass;
},{"../il2cppApi":4,"./NativeStruct":11}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Il2CppFieldInfo = void 0;
const NativeStruct_1 = require("./NativeStruct");
const il2cppApi_1 = require("../il2cppApi");
const utils_1 = require("./utils");
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
},{"../il2cppApi":4,"./NativeStruct":11,"./utils":13}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Il2CppImage = void 0;
const NativeStruct_1 = require("./NativeStruct");
const il2cppApi_1 = require("../il2cppApi");
const structItem_1 = require("./structItem");
const config_1 = require("../../config");
const Il2CppClass_1 = require("./Il2CppClass");
let il2CppImage_struct = new Array();
il2CppImage_struct.push(new structItem_1.StructItem("name", Process.pointerSize));
il2CppImage_struct.push(new structItem_1.StructItem("nameNoExt", Process.pointerSize));
if (config_1.UNITY_VER === config_1.UnityVer.V_2017_4_31f1) {
    il2CppImage_struct.push(new structItem_1.StructItem("assemblyIndex", 4));
}
else {
    il2CppImage_struct.push(new structItem_1.StructItem("assemblyIndex", Process.pointerSize));
}
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
    }
    getOffsetTypeCount() {
        return this.get("typeCount").readPointer().toInt32();
    }
    getClass(index) {
        let soAddr = Module.findBaseAddress(config_1.soName);
        if (config_1.UNITY_VER === config_1.UnityVer.V_2017_4_31f1) {
            if (config_1.FromTypeDefinition_Addr === undefined) {
                throw new Error("current Unity Ver is 2017.4.31f1 you must target FromTypeDefinition address");
            }
            let FromTypeDefinition = new NativeFunction(soAddr.add(config_1.FromTypeDefinition_Addr), 'pointer', ['int']);
            let cls = FromTypeDefinition(this.typeStart() + index);
            return new Il2CppClass_1.Il2CppClass(cls);
        }
        return il2cppApi_1.il2cppApi.il2cpp_image_get_class(this, index);
    }
    get(params) {
        return this.add((0, structItem_1.getStructOffset)(il2CppImage_struct, params));
    }
}
exports.Il2CppImage = Il2CppImage;
},{"../../config":1,"../il2cppApi":4,"./Il2CppClass":5,"./NativeStruct":11,"./structItem":12}],8:[function(require,module,exports){
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
},{"../il2cppApi":4,"./NativeStruct":11}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Il2CppType = void 0;
const NativeStruct_1 = require("./NativeStruct");
const il2cppApi_1 = require("../il2cppApi");
const logger_1 = require("../../logger");
class Il2CppType extends NativeStruct_1.NativeStruct {
    getName() {
        return il2cppApi_1.il2cppApi.il2cpp_type_get_name(this).readCString();
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
},{"../../logger":16,"../il2cppApi":4,"./NativeStruct":11}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MethodInfo = void 0;
const NativeStruct_1 = require("./NativeStruct");
const il2cppApi_1 = require("../il2cppApi");
const METHOD_INFO_OFFSET_SLOT = 76;
class MethodInfo extends NativeStruct_1.NativeStruct {
    getFlags() {
        return il2cppApi_1.il2cppApi.il2cpp_method_get_flags(this, 0);
    }
    getMethodPointer() {
        return il2cppApi_1.il2cppApi.il2cpp_method_get_pointer(this);
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
}
exports.MethodInfo = MethodInfo;
},{"../il2cppApi":4,"./NativeStruct":11}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeStruct = void 0;
class NativeStruct extends NativePointer {
    constructor(pointer) {
        super(pointer);
    }
}
exports.NativeStruct = NativeStruct;
},{}],12:[function(require,module,exports){
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
},{}],13:[function(require,module,exports){
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
    get_method_modifier: function (flags) {
        let content;
        // log("flags:"+flags);
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
},{"../Il2CppTypeEnum":3,"../tabledefs":14}],14:[function(require,module,exports){
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
};
},{}],15:[function(require,module,exports){
(function (setImmediate){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dumper_1 = require("./dumper");
setImmediate(main);
function main() {
    dumper_1.dumper.start();
    // log("hookStart");
}
}).call(this)}).call(this,require("timers").setImmediate)

},{"./dumper":2,"timers":18}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = void 0;
function log(message) {
    console.log(message);
}
exports.log = log;
},{}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
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

},{"process/browser.js":17,"timers":18}]},{},[15])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZ2VudC9jb25maWcudHMiLCJhZ2VudC9kdW1wZXIuanMiLCJhZ2VudC9pbDJjcHAvSWwyQ3BwVHlwZUVudW0uanMiLCJhZ2VudC9pbDJjcHAvaWwyY3BwQXBpLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9JbDJDcHBDbGFzcy5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvSWwyQ3BwRmllbGRJbmZvLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9JbDJDcHBJbWFnZS5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvSWwyQ3BwUHJvcGVydHlJbmZvLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9JbDJDcHBUeXBlLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9NZXRob2RJbmZvLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9OYXRpdmVTdHJ1Y3QuanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L3N0cnVjdEl0ZW0uanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L3V0aWxzLmpzIiwiYWdlbnQvaWwyY3BwL3RhYmxlZGVmcy5qcyIsImFnZW50L2luZGV4LnRzIiwiYWdlbnQvbG9nZ2VyLnRzIiwibm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy90aW1lcnMtYnJvd3NlcmlmeS9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7O0FDQVcsUUFBQSxRQUFRLEdBQUc7SUFDbEIsYUFBYSxFQUFFLGFBQWE7SUFDNUIsYUFBYSxFQUFFLGFBQWE7Q0FDL0IsQ0FBQztBQUNXLFFBQUEsTUFBTSxHQUFHLGNBQWMsQ0FBQztBQUV2QixRQUFBLFFBQVEsR0FBQyxXQUFXLENBQUM7QUFFdEIsUUFBQSxTQUFTLEdBQUcsZ0JBQVEsQ0FBQyxhQUFhLENBQUM7QUFFbkMsUUFBQSx1QkFBdUIsR0FBRyxTQUFTLENBQUMsQ0FBQyw0Q0FBNEM7QUFFakYsUUFBQSxJ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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiJ9
