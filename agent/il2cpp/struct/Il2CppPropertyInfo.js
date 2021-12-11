import {NativeStruct} from "./NativeStruct";
import {il2cppApi} from "../il2cppApi";

export class Il2CppPropertyInfo extends NativeStruct{

    /**
     * 获取方法信息
     * @returns {MethodInfo}
     */
    getMethod(){
        return il2cppApi.il2cpp_property_get_get_method(this);
    }
    setMethod(){
        return il2cppApi.il2cpp_property_get_set_method(this);
    }
    getName(){
        return il2cppApi.il2cpp_property_get_name(this).readCString();
    }
}