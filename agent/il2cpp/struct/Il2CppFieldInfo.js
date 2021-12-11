import {NativeStruct} from "./NativeStruct";
import {il2cppApi} from "../il2cppApi";
import {utils} from "./utils";

export class Il2CppFieldInfo extends NativeStruct {

    getFlags() {

        return il2cppApi.il2cpp_field_get_flags(this);
    }

    /**
     * 获取变量参数类型
     * @returns {Il2CppType}
     */
    getType() {
        return il2cppApi.il2cpp_field_get_type(this);
    }

    /**
     * 获取 静态常量
     * @param value
     */
    getStaticValue() {
        let value = Memory.alloc(Process.pointerSize);
        il2cppApi.il2cpp_field_static_get_value(this, value);
        return utils.readTypeEnumValue(value, this.getType().getTypeEnum(), this.getFiledClass())
    }

    /**
     *  获取变量class
     * @returns {Il2CppClass}
     */
    getFiledClass() {
        let type = this.getType();
        return il2cppApi.il2cpp_class_from_type(type);
    }

    /**
     * 获取变量参数的命名
     * @returns {string}
     */
    getFiledName() {
        return il2cppApi.il2cpp_field_get_name(this).readCString();
    }

    /**
     * 获取偏移
     * @returns {*}
     */
    getOffset() {
        return il2cppApi.il2cpp_field_get_offset(this);
    }
}