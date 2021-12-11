import {NativeStruct} from "./NativeStruct";
import {il2cppApi} from "../il2cppApi";
import {log} from "../../logger";

export class Il2CppType extends NativeStruct{

    getName(){
        return il2cppApi.il2cpp_type_get_name(this).readCString();
    }

    getTypeEnum(){
        return il2cppApi.il2cpp_type_get_type(this);
    }
    byref(){
        let il2cppTypeIsByref = il2cppApi.il2cpp_type_is_byref(this);
        log(" il2cppTypeIsByref:"+il2cppTypeIsByref)
        return il2cppTypeIsByref;
    }
}