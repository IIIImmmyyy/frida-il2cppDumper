import {NativeStruct} from "./NativeStruct";
import {il2cppApi} from "../il2cppApi";
import {log} from "../../logger";


const METHOD_INFO_OFFSET_SLOT=76;
export class MethodInfo extends NativeStruct{


    getFlags(){
        return il2cppApi.il2cpp_method_get_flags(this,0);
    }

    getMethodPointer(){
        return il2cppApi.il2cpp_method_get_pointer(this);
    }
    getSlot(){
        return this.add(METHOD_INFO_OFFSET_SLOT).readU16();
    }
    name(){
        return il2cppApi.il2cpp_method_get_name(this).readCString();
    }
    getParamCount(){
        return il2cppApi.il2cpp_method_get_param_count(this);
    }
    getParam(index){
        return il2cppApi.il2cpp_method_get_param(this,index);
    }
    getParamName(index){
        return il2cppApi.il2cpp_method_get_param_name(this,index).readCString();
    }
    /**
     * 获取返回类型
     * @returns {Il2CppType}
     */
    getReturnType(){
        return il2cppApi.il2cpp_method_get_return_type(this);
    }
}