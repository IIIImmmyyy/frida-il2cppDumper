import {NativeStruct} from "./NativeStruct";
import {il2cppApi} from "../il2cppApi";
import {getStructOffset, StructItem} from "./structItem";
import {FromTypeDefinition_Addr, soName, UNITY_VER, UnityVer} from "../../config";
import {Il2CppClass} from "./Il2CppClass";
import {log} from "../../logger";

let il2CppImage_struct = new Array();
il2CppImage_struct.push(new StructItem("name", Process.pointerSize));
il2CppImage_struct.push(new StructItem("nameNoExt", Process.pointerSize));
if (UNITY_VER===UnityVer.V_2017_4_31f1){
    il2CppImage_struct.push(new StructItem("assemblyIndex", 4));
}else {
    il2CppImage_struct.push(new StructItem("assemblyIndex", Process.pointerSize));
}
il2CppImage_struct.push(new StructItem("typeStart", 4));
il2CppImage_struct.push(new StructItem("typeCount", 4));
il2CppImage_struct.push(new StructItem("exportedTypeStart", 4));

export class Il2CppImage extends NativeStruct {


    name() {
        return il2cppApi.il2cpp_image_get_name(this).readCString();
    }

    nameNoExt() {
        let name1 = this.name();
        return name1.replace(".dll", "");
    }

    typeStart() {
        return this.get("typeStart").readPointer().toInt32();
    }

    typeCount() {

      return  il2cppApi.il2cpp_image_get_class_count(this);

    }
    getOffsetTypeCount(){

        return this.get("typeCount").readPointer().toInt32();
    }

    getClass(index) {
        let soAddr = Module.findBaseAddress(soName);
        if (UNITY_VER === UnityVer.V_2017_4_31f1) {
            if (FromTypeDefinition_Addr===undefined){
                throw new Error("current Unity Ver is 2017.4.31f1 you must target FromTypeDefinition address")
            }
            let FromTypeDefinition = new NativeFunction(soAddr.add(FromTypeDefinition_Addr), 'pointer', ['int']);
            let cls = FromTypeDefinition(this.typeStart() + index);
            return new Il2CppClass(cls);
        }
        return il2cppApi.il2cpp_image_get_class(this, index);

    }

    get(params) {
        return this.add(getStructOffset(il2CppImage_struct, params));
    }
}