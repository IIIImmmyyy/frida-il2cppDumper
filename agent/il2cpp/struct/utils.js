import {Il2CppTypeEnum} from "../Il2CppTypeEnum";
import {log} from "../../logger";
import {Tabledefs as tabledefs} from "../tabledefs";


export var utils = {

    readTypeEnumValue: function (pointer, typeEnum, fieldClass) {
        switch (typeEnum) {
            case Il2CppTypeEnum.IL2CPP_TYPE_BOOLEAN:
                return !!pointer.readS8();
            case Il2CppTypeEnum.IL2CPP_TYPE_I1:
                return pointer.readS8();
            case Il2CppTypeEnum.IL2CPP_TYPE_I2:
                return pointer.readS16();
            case Il2CppTypeEnum.IL2CPP_TYPE_U2:
                return pointer.readU16();
            case Il2CppTypeEnum.IL2CPP_TYPE_I4:
                return pointer.readS32();
            case Il2CppTypeEnum.IL2CPP_TYPE_U4:
                return pointer.readU32();
            case Il2CppTypeEnum.IL2CPP_TYPE_CHAR:
                return pointer.readU16();
            case Il2CppTypeEnum.IL2CPP_TYPE_I8:
                return pointer.readS64();
            case Il2CppTypeEnum.IL2CPP_TYPE_U8:
                return pointer.readU64();
            case Il2CppTypeEnum.IL2CPP_TYPE_R4:
                return pointer.readFloat();
            case Il2CppTypeEnum.IL2CPP_TYPE_R8:
                return pointer.readDouble();
            case Il2CppTypeEnum.IL2CPP_TYPE_VALUETYPE:
                let enumBaseType = fieldClass.getEnumBaseType();
                // log("baseType:"+enumBaseType.getTypeEnum()+"pointer:"+pointer.readS32());
                if (enumBaseType.getTypeEnum() === Il2CppTypeEnum.IL2CPP_TYPE_I4) {
                    return pointer.readS32();
                }
                return null;
            default:
                return null;

        }
    }
    ,
    get_method_modifier: function (flags) {
        let content;
        // log("flags:"+flags);
        let access = flags & tabledefs.METHOD_ATTRIBUTE_MEMBER_ACCESS_MASK;
        switch (access) {
            case tabledefs.METHOD_ATTRIBUTE_PRIVATE:
                content = "private ";
                break;
            case tabledefs.METHOD_ATTRIBUTE_PUBLIC:
                content = "public ";
                break;
            case tabledefs.METHOD_ATTRIBUTE_FAMILY:
                content = "protected ";
                break;
            case tabledefs.METHOD_ATTRIBUTE_ASSEM:
            case tabledefs.METHOD_ATTRIBUTE_FAM_AND_ASSEM:
                content = "internal ";
                break;
            case tabledefs.METHOD_ATTRIBUTE_FAM_OR_ASSEM:
                content = "protected internal ";
                break;
        }
        if (flags & tabledefs.METHOD_ATTRIBUTE_STATIC) {
            content = content + "static ";
        }
        if (flags & tabledefs.METHOD_ATTRIBUTE_ABSTRACT) {
            content = content+ "abstract ";
            if ((flags & tabledefs.METHOD_ATTRIBUTE_VTABLE_LAYOUT_MASK) === tabledefs.METHOD_ATTRIBUTE_REUSE_SLOT) {
                content = content+ "override ";
            }
        } else if (flags & tabledefs.METHOD_ATTRIBUTE_FINAL) {
            if ((flags & tabledefs.METHOD_ATTRIBUTE_VTABLE_LAYOUT_MASK) === tabledefs.METHOD_ATTRIBUTE_REUSE_SLOT) {
                content = content+  "sealed override ";
            }
        } else if (flags & tabledefs.METHOD_ATTRIBUTE_VIRTUAL) {
            if ((flags & tabledefs.METHOD_ATTRIBUTE_VTABLE_LAYOUT_MASK) === tabledefs.METHOD_ATTRIBUTE_NEW_SLOT) {
                content = content+ "virtual ";
            } else {
                content = content+  "override ";
            }
        }
        if (flags & tabledefs.METHOD_ATTRIBUTE_PINVOKE_IMPL) {
            content = content+ "extern ";
        }
        return content;
    }

}