import {il2cppApi} from "./il2cpp/il2cppApi";
import {log} from "./logger";
import {path, soName, UNITY_VER} from "./config";
import {Tabledefs as tabledefs} from "./il2cpp/tabledefs";
import {Il2CppTypeEnum} from "./il2cpp/Il2CppTypeEnum";
import {utils} from "./il2cpp/struct/utils";
import {getStructOffset} from "./il2cpp/struct/structItem";

let file = new File(path, "wb");
export var dumper = {
    start: function () {
        let domain = il2cppApi.il2cpp_domain_get();
        let size_t = Memory.alloc(Process.pointerSize);
        let assemblies = il2cppApi.il2cpp_domain_get_assemblies(domain, size_t);
        let assemblies_count = size_t.readInt();
        log("assemblies_count:" + assemblies_count);
        let il2CppImageArray = new Array();
        for (let i = 0; i < assemblies_count; i++) {
            let assembly = assemblies.add(Process.pointerSize * i).readPointer();
            let Il2CppImage = il2cppApi.il2cpp_assembly_get_image(assembly);
            let typeStart = Il2CppImage.typeStart();
            // log("typeStart:"+typeStart +" name:"+Il2CppImage.nameNoExt());
            this.out(" // Image :" + i + " " + Il2CppImage.nameNoExt() + " - " + Il2CppImage.typeStart() + "\n")
            il2CppImageArray.push(Il2CppImage);

        }
        for (let i = 0; i < il2CppImageArray.length; i++) {
            log("process: "+(i+1)+"/"+assemblies_count);
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
        log("dump end")


        // log("nativeFunNotExistMap:" + il2cppApi.nativeFunNotExistMap.size);
        if (il2cppApi.nativeFunNotExistMap.size > 0) {
            log("in Unity: " + UNITY_VER + "  some NativeFun is un exist ,parser will be not accurate :");
            il2cppApi.nativeFunNotExistMap.forEach(function (value, key) {
                log(key + "");
            })
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
        let klass = il2cppApi.il2cpp_class_from_type(il2CppType);
        this.out("\n//Namespace：" + klass.namespaze() + "\n")
        let flags = klass.flags();
        let Serializable = flags & tabledefs.TYPE_ATTRIBUTE_SERIALIZABLE;
        if (Serializable) {
            this.out('[Serializable]\n')
        }
        let visibility = flags & tabledefs.TYPE_ATTRIBUTE_VISIBILITY_MASK;
        switch (visibility) {
            case tabledefs.TYPE_ATTRIBUTE_PUBLIC:
            case tabledefs.TYPE_ATTRIBUTE_NESTED_PUBLIC:
                this.out("public ")
                break;
            case tabledefs.TYPE_ATTRIBUTE_NOT_PUBLIC:
            case tabledefs.TYPE_ATTRIBUTE_NESTED_FAM_AND_ASSEM:
            case tabledefs.TYPE_ATTRIBUTE_NESTED_ASSEMBLY:
                this.out("internal ")
                break;
            case tabledefs.TYPE_ATTRIBUTE_NESTED_PRIVATE:
                this.out("private ")
                break;
            case tabledefs.TYPE_ATTRIBUTE_NESTED_FAMILY:
                this.out("protected ")
                break;
            case tabledefs.TYPE_ATTRIBUTE_NESTED_FAM_OR_ASSEM:
                this.out("protected internal ")
                break;
        }
        let isValuetype = klass.valueType();
        let IsEnum = klass.enumType();
        if (flags & tabledefs.TYPE_ATTRIBUTE_ABSTRACT && flags & tabledefs.TYPE_ATTRIBUTE_SEALED) {
            this.out("static ")
        } else if (!(flags & tabledefs.TYPE_ATTRIBUTE_INTERFACE) && flags & tabledefs.TYPE_ATTRIBUTE_ABSTRACT) {
            this.out("abstract ")
        } else if (!isValuetype && !IsEnum && flags & tabledefs.TYPE_ATTRIBUTE_SEALED) {
            this.out("sealed ")
        }
        if (flags & tabledefs.TYPE_ATTRIBUTE_INTERFACE) {
            this.out("interface ")
        } else if (IsEnum) {
            this.out("enum ")
        } else if (isValuetype) {
            this.out("struct ");
        } else {
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
            if (typeEnum === Il2CppTypeEnum.IL2CPP_TYPE_OBJECT) {
                //not out
            } else {
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
                this.out(": " + interfaces_name)
                hasParent = true;
            } else {
                this.out(", " + interfaces_name);
            }
        }
        this.out("\n{\n")
        this.dumpFiled(klass);
        this.dumpPropertyInfo(klass);
        this.dumpMethod(klass);
        this.out("\n}");

    },
    dumpMethod: function (klass) {
        let iter = Memory.alloc(Process.pointerSize);
        let methodInfo;
        let isFirst = true;
        let baseAddr = Module.findBaseAddress(soName);
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
            } else {
                this.out("\t// RVA: 0x  VA: 0x0");
            }
            // log("slot:" + methodInfo.getSlot());
            if (methodInfo.getSlot() !== 65535) {
                this.out(" Slot: " + methodInfo.getSlot());
            }
            this.out("\n\t");
            let methodModifier = utils.get_method_modifier(methodInfo.getFlags());
            this.out(methodModifier);

            let returnType = methodInfo.getReturnType();
            let typeEnum = returnType.getTypeEnum();
            // log("returnType typeEnum:"+typeEnum);
            // if (returnType.byref()){
            //     this.out("ref ");
            // }
            let return_cls = il2cppApi.il2cpp_class_from_type(returnType);
            this.out(return_cls.name() + " " + methodInfo.name() + "(");
            let paramCount = methodInfo.getParamCount();
            // log("paramCount:" + paramCount);
            if (paramCount>0){
                for (let i = 0; i < paramCount; i++) {
                    let paramType = methodInfo.getParam(i);
                    let paramCls = il2cppApi.il2cpp_class_from_type(paramType);
                    let name = paramCls.name();
                    //获取泛型
                    if (name.indexOf("`") !== -1) {
                        let split = name.split("`");
                        name = split[0];
                        name = name + paramCls.getGenericName();
                    }
                    this.out(name+" "+methodInfo.getParamName(i));
                    if (i+1!==paramCount){
                        this.out(", ");
                    }else {
                        this.out( ") { }\n");
                    }
                }
            }else {
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
            if (!method.isNull()) {
                let methodModifier = utils.get_method_modifier(method.getFlags());
                let methodPointer = method.getMethodPointer()
                // log("methodModifier:" + methodModifier);
                this.out(methodModifier);
                pro_class = il2cppApi.il2cpp_class_from_type(method.getReturnType());
            } else if (!setMethod.isNull()) {
                let setModifier = utils.get_method_modifier(setMethod.getFlags());
                this.out(setModifier);
                pro_class = il2cppApi.il2cpp_class_from_type(setMethod.getReturnType());
            }
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
                this.out("\t")
                let access = flags & tabledefs.FIELD_ATTRIBUTE_FIELD_ACCESS_MASK;
                switch (access) {
                    case tabledefs.FIELD_ATTRIBUTE_PRIVATE:
                        this.out("private ")
                        break;
                    case tabledefs.FIELD_ATTRIBUTE_PUBLIC:
                        this.out("public ")
                        break;
                    case tabledefs.FIELD_ATTRIBUTE_FAMILY:
                        this.out("protected ")
                        break;
                    case tabledefs.FIELD_ATTRIBUTE_ASSEMBLY:
                    case tabledefs.FIELD_ATTRIBUTE_FAM_AND_ASSEM:
                        this.out("internal ")
                        break;
                    case tabledefs.FIELD_ATTRIBUTE_FAM_OR_ASSEM:
                        this.out("protected internal ")
                        break;
                }
                if (flags & tabledefs.FIELD_ATTRIBUTE_LITERAL) {
                    this.out("const ")
                } else {
                    if (flags & tabledefs.FIELD_ATTRIBUTE_STATIC) {
                        this.out("static ")
                    }
                    if (flags & tabledefs.FIELD_ATTRIBUTE_INIT_ONLY) {
                        this.out("readonly ")
                    }
                }
                let fieldClass = filedInfo.getFiledClass();
                let name = fieldClass.name(); //参数名
                let offset = filedInfo.getOffset();//偏移
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
                if (flags & tabledefs.FIELD_ATTRIBUTE_LITERAL) {
                    let staticValue = filedInfo.getStaticValue();
                    if (staticValue !== null) {
                        this.out(" = " + staticValue + ";\n");
                    }
                } else {
                    this.out(" ;// 0x" + offset.toString(16).toUpperCase() + "\n");
                }

            }
        }
    },
    out: function (string) {
        file.write(string);
        file.flush();
    }
}