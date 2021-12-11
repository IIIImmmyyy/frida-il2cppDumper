(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: !0
}), exports.API_NOT_EXIT = exports.FromTypeDefinition_Addr = exports.path = exports.UNITY_VER = exports.pkg_name = exports.soName = exports.UnityVer = void 0, 
exports.UnityVer = {
  V_2017_4_31f1: "2017.4.31f1",
  V_2018_4_36f1: "2018.4.36f1"
}, exports.soName = "libil2cpp.so", exports.pkg_name = "com.miHoYo.Yuanshen", exports.UNITY_VER = exports.UnityVer.V_2017_4_31f1, 
exports.path = "/data/data/" + exports.pkg_name + "/dump.cs", exports.FromTypeDefinition_Addr = 196884712, 
exports.API_NOT_EXIT = -1001;

},{}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: !0
}), exports.dumper = void 0;

const e = require("./il2cpp/il2cppApi"), t = require("./logger"), i = require("./config"), s = require("./il2cpp/tabledefs"), l = require("./il2cpp/Il2CppTypeEnum"), o = require("./il2cpp/struct/utils");

let T = new File(i.path, "wb");

exports.dumper = {
  start: function() {
    let s = e.il2cppApi.il2cpp_domain_get(), l = Memory.alloc(Process.pointerSize), o = e.il2cppApi.il2cpp_domain_get_assemblies(s, l), T = l.readInt();
    (0, t.log)("assemblies_count:" + T);
    let a = new Array;
    for (let t = 0; t < T; t++) {
      let i = o.add(Process.pointerSize * t).readPointer(), s = e.il2cppApi.il2cpp_assembly_get_image(i);
      s.typeStart();
      this.out(" // Image :" + t + " " + s.nameNoExt() + " - " + s.typeStart() + "\n"), 
      a.push(s);
    }
    for (let e = 0; e < a.length; e++) {
      (0, t.log)("process: " + (e + 1) + "/" + T);
      let i = a[e], s = i.nameNoExt(), l = i.typeStart(), o = i.typeCount();
      this.out("\n//assembly Image --\x3e:" + s + "    startIndex:" + l + "   typeCount:" + o), 
      this.findAllClass(i);
    }
    (0, t.log)("dump end"), e.il2cppApi.nativeFunNotExistMap.size > 0 && ((0, t.log)("in Unity: " + i.UNITY_VER + "  some NativeFun is un exist ,parser will be not accurate :"), 
    e.il2cppApi.nativeFunNotExistMap.forEach((function(e, i) {
      (0, t.log)(i + "");
    })));
  },
  findAllClass: function(e) {
    let t = e.typeCount();
    for (let i = 0; i < t; i++) {
      let t = e.getClass(i).getType();
      this.dumpType(t);
    }
  },
  dumpType: function(t) {
    let i = e.il2cppApi.il2cpp_class_from_type(t);
    this.out("\n//Namespace：" + i.namespaze() + "\n");
    let o = i.flags();
    switch (o & s.Tabledefs.TYPE_ATTRIBUTE_SERIALIZABLE && this.out("[Serializable]\n"), 
    o & s.Tabledefs.TYPE_ATTRIBUTE_VISIBILITY_MASK) {
     case s.Tabledefs.TYPE_ATTRIBUTE_PUBLIC:
     case s.Tabledefs.TYPE_ATTRIBUTE_NESTED_PUBLIC:
      this.out("public ");
      break;

     case s.Tabledefs.TYPE_ATTRIBUTE_NOT_PUBLIC:
     case s.Tabledefs.TYPE_ATTRIBUTE_NESTED_FAM_AND_ASSEM:
     case s.Tabledefs.TYPE_ATTRIBUTE_NESTED_ASSEMBLY:
      this.out("internal ");
      break;

     case s.Tabledefs.TYPE_ATTRIBUTE_NESTED_PRIVATE:
      this.out("private ");
      break;

     case s.Tabledefs.TYPE_ATTRIBUTE_NESTED_FAMILY:
      this.out("protected ");
      break;

     case s.Tabledefs.TYPE_ATTRIBUTE_NESTED_FAM_OR_ASSEM:
      this.out("protected internal ");
    }
    let T = i.valueType(), a = i.enumType();
    o & s.Tabledefs.TYPE_ATTRIBUTE_ABSTRACT && o & s.Tabledefs.TYPE_ATTRIBUTE_SEALED ? this.out("static ") : !(o & s.Tabledefs.TYPE_ATTRIBUTE_INTERFACE) && o & s.Tabledefs.TYPE_ATTRIBUTE_ABSTRACT ? this.out("abstract ") : !T && !a && o & s.Tabledefs.TYPE_ATTRIBUTE_SEALED && this.out("sealed "), 
    o & s.Tabledefs.TYPE_ATTRIBUTE_INTERFACE ? this.out("interface ") : a ? this.out("enum ") : T ? this.out("struct ") : this.out("class ");
    let p = i.name();
    if (-1 !== p.indexOf("`")) {
      let e = p.split("`");
      p = e[0], p += i.getGenericName();
    }
    this.out(p + " ");
    let u = i.parent(), r = !1;
    if (!T && !a && !u.isNull()) {
      u.getType().getTypeEnum() === l.Il2CppTypeEnum.IL2CPP_TYPE_OBJECT || (r = !0, this.out(": " + u.name()));
    }
    let n, _ = Memory.alloc(Process.pointerSize);
    for (;!(n = i.getInterfaces(_)).isNull(); ) {
      let e = n.name();
      if (-1 !== e.indexOf("`")) {
        let t = e.split("`");
        e = t[0], e += n.getGenericName();
      }
      r ? this.out(", " + e) : (this.out(": " + e), r = !0);
    }
    this.out("\n{\n"), this.dumpFiled(i), this.dumpPropertyInfo(i), this.dumpMethod(i), 
    this.out("\n}");
  },
  dumpMethod: function(t) {
    let s, l = Memory.alloc(Process.pointerSize), T = !0, a = Module.findBaseAddress(i.soName);
    for (;!(s = t.getMethods(l)).isNull(); ) {
      T && (this.out("\n\t//methods\n"), T = !1);
      let t = s.getMethodPointer();
      if (t.isNull()) this.out("\t// RVA: 0x  VA: 0x0"); else {
        let e = t - a;
        this.out("\t// RVA: 0x" + e.toString(16).toUpperCase()), this.out("  VA: 0x"), this.out(t.toString(16).toUpperCase());
      }
      65535 !== s.getSlot() && this.out(" Slot: " + s.getSlot()), this.out("\n\t");
      let i = o.utils.get_method_modifier(s.getFlags());
      this.out(i);
      let l = s.getReturnType(), p = (l.getTypeEnum(), e.il2cppApi.il2cpp_class_from_type(l));
      this.out(p.name() + " " + s.name() + "(");
      let u = s.getParamCount();
      if (u > 0) for (let t = 0; t < u; t++) {
        let i = s.getParam(t), l = e.il2cppApi.il2cpp_class_from_type(i), o = l.name();
        if (-1 !== o.indexOf("`")) {
          let e = o.split("`");
          o = e[0], o += l.getGenericName();
        }
        this.out(o + " " + s.getParamName(t)), t + 1 !== u ? this.out(", ") : this.out(") { }\n");
      } else this.out("){ }\n");
    }
  },
  dumpPropertyInfo: function(t) {
    let i, s = Memory.alloc(Process.pointerSize), l = !0;
    for (;!(i = t.getProperties(s)).isNull(); ) {
      let t;
      l && (this.out("\n\t// Properties\n"), l = !1), this.out("\t");
      let s = i.getMethod(), T = i.setMethod();
      if (s.isNull()) {
        if (!T.isNull()) {
          let i = o.utils.get_method_modifier(T.getFlags());
          this.out(i), t = e.il2cppApi.il2cpp_class_from_type(T.getReturnType());
        }
      } else {
        let i = o.utils.get_method_modifier(s.getFlags());
        s.getMethodPointer();
        this.out(i), t = e.il2cppApi.il2cpp_class_from_type(s.getReturnType());
      }
      this.out(t.name() + " " + i.getName() + " { "), s.isNull() || this.out("get; "), 
      T.isNull() || this.out("set; "), this.out("}\n");
    }
  },
  dumpFiled: function(e) {
    if (e.filedCount() > 0) {
      let t, i = Memory.alloc(Process.pointerSize);
      for (this.out("\t//Fileds\n"); !(t = e.getFieldsInfo(i)).isNull(); ) {
        let e = t.getFlags();
        switch (this.out("\t"), e & s.Tabledefs.FIELD_ATTRIBUTE_FIELD_ACCESS_MASK) {
         case s.Tabledefs.FIELD_ATTRIBUTE_PRIVATE:
          this.out("private ");
          break;

         case s.Tabledefs.FIELD_ATTRIBUTE_PUBLIC:
          this.out("public ");
          break;

         case s.Tabledefs.FIELD_ATTRIBUTE_FAMILY:
          this.out("protected ");
          break;

         case s.Tabledefs.FIELD_ATTRIBUTE_ASSEMBLY:
         case s.Tabledefs.FIELD_ATTRIBUTE_FAM_AND_ASSEM:
          this.out("internal ");
          break;

         case s.Tabledefs.FIELD_ATTRIBUTE_FAM_OR_ASSEM:
          this.out("protected internal ");
        }
        e & s.Tabledefs.FIELD_ATTRIBUTE_LITERAL ? this.out("const ") : (e & s.Tabledefs.FIELD_ATTRIBUTE_STATIC && this.out("static "), 
        e & s.Tabledefs.FIELD_ATTRIBUTE_INIT_ONLY && this.out("readonly "));
        let i = t.getFiledClass(), l = i.name(), o = t.getOffset();
        if (-1 !== l.indexOf("`")) {
          let e = i.getGenericName(), t = l.split("`");
          l = t[0], l += e;
        }
        if (this.out(l + " " + t.getFiledName()), e & s.Tabledefs.FIELD_ATTRIBUTE_LITERAL) {
          let e = t.getStaticValue();
          null !== e && this.out(" = " + e + ";\n");
        } else this.out(" ;// 0x" + o.toString(16).toUpperCase() + "\n");
      }
    }
  },
  out: function(e) {
    T.write(e), T.flush();
  }
};

},{"./config":1,"./il2cpp/Il2CppTypeEnum":3,"./il2cpp/il2cppApi":4,"./il2cpp/struct/utils":13,"./il2cpp/tabledefs":14,"./logger":16}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: !0
}), exports.Il2CppTypeEnum = void 0, exports.Il2CppTypeEnum = {
  IL2CPP_TYPE_END: 0,
  IL2CPP_TYPE_VOID: 1,
  IL2CPP_TYPE_BOOLEAN: 2,
  IL2CPP_TYPE_CHAR: 3,
  IL2CPP_TYPE_I1: 4,
  IL2CPP_TYPE_U1: 5,
  IL2CPP_TYPE_I2: 6,
  IL2CPP_TYPE_U2: 7,
  IL2CPP_TYPE_I4: 8,
  IL2CPP_TYPE_U4: 9,
  IL2CPP_TYPE_I8: 10,
  IL2CPP_TYPE_U8: 11,
  IL2CPP_TYPE_R4: 12,
  IL2CPP_TYPE_R8: 13,
  IL2CPP_TYPE_STRING: 14,
  IL2CPP_TYPE_PTR: 15,
  IL2CPP_TYPE_BYREF: 16,
  IL2CPP_TYPE_VALUETYPE: 17,
  IL2CPP_TYPE_CLASS: 18,
  IL2CPP_TYPE_VAR: 19,
  IL2CPP_TYPE_ARRAY: 20,
  IL2CPP_TYPE_GENERICINST: 21,
  IL2CPP_TYPE_TYPEDBYREF: 22,
  IL2CPP_TYPE_I: 24,
  IL2CPP_TYPE_U: 25,
  IL2CPP_TYPE_FNPTR: 27,
  IL2CPP_TYPE_OBJECT: 28,
  IL2CPP_TYPE_SZARRAY: 29,
  IL2CPP_TYPE_MVAR: 30,
  IL2CPP_TYPE_CMOD_REQD: 31,
  IL2CPP_TYPE_CMOD_OPT: 32,
  IL2CPP_TYPE_INTERNAL: 33,
  IL2CPP_TYPE_MODIFIER: 64,
  IL2CPP_TYPE_SENTINEL: 65,
  IL2CPP_TYPE_PINNED: 69,
  IL2CPP_TYPE_ENUM: 85
};

},{}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: !0
}), exports.il2cppApi = void 0;

const t = require("../config"), e = require("./struct/Il2CppImage"), p = require("./struct/Il2CppClass"), i = require("./struct/Il2CppType"), n = require("./struct/Il2CppFieldInfo"), _ = require("./struct/Il2CppPropertyInfo"), l = require("./struct/MethodInfo");

let o = new Map;

exports.il2cppApi = {
  nativeFunNotExistMap: new Map,
  il2cpp_domain_get: function() {
    return this.load("il2cpp_domain_get", "pointer", []);
  },
  il2cpp_domain_get_assemblies: function(t, e) {
    return this.load("il2cpp_domain_get_assemblies", "pointer", [ "pointer", "pointer" ])(t, e);
  },
  il2cpp_assembly_get_image: function(t) {
    let p = this.load("il2cpp_assembly_get_image", "pointer", [ "pointer" ]);
    return new e.Il2CppImage(p(t));
  },
  il2cpp_image_get_class_count: function(t) {
    let e = this.load("il2cpp_image_get_class_count", "pointer", [ "pointer" ]);
    return void 0 !== e && e(t).toUInt32(), t.getOffsetTypeCount();
  },
  il2cpp_image_get_name: function(t) {
    return this.load("il2cpp_image_get_name", "pointer", [ "pointer" ])(t);
  },
  il2cpp_image_get_class: function(t, e) {
    let i = this.load("il2cpp_image_get_class", "pointer", [ "pointer", "int" ])(t, e);
    return new p.Il2CppClass(i);
  },
  il2cpp_class_get_type: function(t) {
    let e = this.load("il2cpp_class_get_type", "pointer", [ "pointer" ]);
    return new i.Il2CppType(e(t));
  },
  il2cpp_class_get_element_class: function(t) {
    let e = this.load("il2cpp_class_get_element_class", "pointer", [ "pointer" ]);
    return new p.Il2CppClass(e(t));
  },
  il2cpp_class_get_declaring_type: function(t) {
    let e = this.load("il2cpp_class_get_declaring_type", "pointer", [ "pointer" ]);
    return new p.Il2CppClass(e(t));
  },
  il2cpp_class_from_type: function(t) {
    let e = this.load("il2cpp_class_from_type", "pointer", [ "pointer" ]);
    return new p.Il2CppClass(e(t));
  },
  il2cpp_class_enum_basetype: function(t) {
    let e = this.load("il2cpp_class_enum_basetype", "pointer", [ "pointer" ]);
    return new i.Il2CppType(e(t));
  },
  il2cpp_class_value_size: function(t, e) {
    return this.load("il2cpp_class_value_size", "int32", [ "pointer", "pointer" ])(t);
  },
  il2cpp_class_get_flags: function(t) {
    return this.load("il2cpp_class_get_flags", "int", [ "pointer" ])(t);
  },
  il2cpp_class_is_valuetype: function(t) {
    return this.load("il2cpp_class_is_valuetype", "bool", [ "pointer" ])(t);
  },
  il2cpp_class_is_enum: function(t) {
    return this.load("il2cpp_class_is_enum", "bool", [ "pointer" ])(t);
  },
  il2cpp_class_get_name: function(t) {
    return this.load("il2cpp_class_get_name", "pointer", [ "pointer" ])(t);
  },
  il2cpp_class_get_parent: function(t) {
    return this.load("il2cpp_class_get_parent", "pointer", [ "pointer" ])(t);
  },
  il2cpp_class_get_interfaces: function(t, e) {
    let i = this.load("il2cpp_class_get_interfaces", "pointer", [ "pointer", "pointer" ]);
    return new p.Il2CppClass(i(t, e));
  },
  il2cpp_class_get_namespace: function(t) {
    return this.load("il2cpp_class_get_namespace", "pointer", [ "pointer" ])(t);
  },
  il2cpp_class_num_fields: function(t) {
    return this.load("il2cpp_class_num_fields", "size_t", [ "pointer" ])(t);
  },
  il2cpp_class_get_fields: function(t, e) {
    let p = this.load("il2cpp_class_get_fields", "pointer", [ "pointer", "pointer" ]);
    return new n.Il2CppFieldInfo(p(t, e));
  },
  il2cpp_class_get_properties: function(t, e) {
    let p = this.load("il2cpp_class_get_properties", "pointer", [ "pointer", "pointer" ]);
    return new _.Il2CppPropertyInfo(p(t, e));
  },
  il2cpp_class_get_methods: function(t, e) {
    let p = this.load("il2cpp_class_get_methods", "pointer", [ "pointer", "pointer" ]);
    return new l.MethodInfo(p(t, e));
  },
  il2cpp_type_get_type: function(t) {
    return this.load("il2cpp_type_get_type", "int", [ "pointer" ])(t);
  },
  il2cpp_type_is_byref: function(t) {
    let e = this.load("il2cpp_type_is_byref", "bool", [ "pointer" ]);
    return void 0 !== e ? e(t) : t.add(4).readS8();
  },
  il2cpp_type_get_object: function(t) {
    return this.load("il2cpp_type_get_object", "pointer", [ "pointer" ])(t);
  },
  il2cpp_type_get_name: function(t) {
    return this.load("il2cpp_type_get_name", "pointer", [ "pointer" ])(t);
  },
  il2cpp_field_static_get_value: function(t, e) {
    return this.load("il2cpp_field_static_get_value", "void", [ "pointer", "pointer" ])(t, e);
  },
  il2cpp_field_get_parent: function(t) {
    let e = this.load("il2cpp_field_get_parent", "void", [ "pointer", "pointer" ]);
    return new p.Il2CppClass(e(t));
  },
  il2cpp_field_get_flags: function(t) {
    return this.load("il2cpp_field_get_flags", "int", [ "pointer" ])(t);
  },
  il2cpp_field_get_type: function(t) {
    let e = this.load("il2cpp_field_get_type", "pointer", [ "pointer" ]);
    return new i.Il2CppType(e(t));
  },
  il2cpp_field_get_name: function(t) {
    return this.load("il2cpp_field_get_name", "pointer", [ "pointer" ])(t);
  },
  il2cpp_field_get_offset: function(t) {
    return this.load("il2cpp_field_get_offset", "size_t", [ "pointer" ])(t);
  },
  il2cpp_property_get_get_method: function(t) {
    let e = this.load("il2cpp_property_get_get_method", "pointer", [ "pointer" ]);
    return new l.MethodInfo(e(t));
  },
  il2cpp_property_get_set_method: function(t) {
    let e = this.load("il2cpp_property_get_set_method", "pointer", [ "pointer" ]);
    return new l.MethodInfo(e(t));
  },
  il2cpp_property_get_name: function(t) {
    return this.load("il2cpp_property_get_name", "pointer", [ "pointer" ])(t);
  },
  il2cpp_method_get_flags: function(t, e) {
    return this.load("il2cpp_method_get_flags", "uint32", [ "pointer", "uint32" ])(t, e);
  },
  il2cpp_method_get_name: function(t) {
    return this.load("il2cpp_method_get_name", "pointer", [ "pointer" ])(t);
  },
  il2cpp_method_get_pointer: function(t) {
    let e = this.load("il2cpp_method_get_pointer", "pointer", [ "pointer" ]);
    return void 0 !== e ? e(t) : t.readPointer();
  },
  il2cpp_method_get_param_count: function(t) {
    return this.load("il2cpp_method_get_param_count", "uint32", [ "pointer" ])(t);
  },
  il2cpp_method_get_return_type: function(t) {
    let e = this.load("il2cpp_method_get_return_type", "pointer", [ "pointer" ]);
    return new i.Il2CppType(e(t));
  },
  il2cpp_method_get_param: function(t, e) {
    let p = this.load("il2cpp_method_get_param", "pointer", [ "pointer", "uint32" ]);
    return new i.Il2CppType(p(t, e));
  },
  il2cpp_method_get_param_name: function(t, e) {
    return this.load("il2cpp_method_get_param_name", "pointer", [ "pointer", "uint32" ])(t, e);
  },
  load: function(e, p, i) {
    let n = o.get(e);
    if (null == n) {
      if (-1 === this.nativeFunNotExistMap.get(e)) return;
      let _ = Module.findExportByName(t.soName, e);
      if (null == _) return void this.nativeFunNotExistMap.set(e, -1);
      n = new NativeFunction(_, p, i), o.set(e, n);
    }
    return o.get(e);
  }
};

},{"../config":1,"./struct/Il2CppClass":5,"./struct/Il2CppFieldInfo":6,"./struct/Il2CppImage":7,"./struct/Il2CppPropertyInfo":8,"./struct/Il2CppType":9,"./struct/MethodInfo":10}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: !0
}), exports.Il2CppClass = void 0;

const e = require("./NativeStruct"), p = require("../il2cppApi");

class t extends e.NativeStruct {
  name() {
    return p.il2cppApi.il2cpp_class_get_name(this).readCString();
  }
  namespaze() {
    return p.il2cppApi.il2cpp_class_get_namespace(this).readCString();
  }
  flags() {
    return p.il2cppApi.il2cpp_class_get_flags(this);
  }
  valueType() {
    return p.il2cppApi.il2cpp_class_is_valuetype(this);
  }
  enumType() {
    return p.il2cppApi.il2cpp_class_is_enum(this);
  }
  getType() {
    return p.il2cppApi.il2cpp_class_get_type(this);
  }
  getElementClass() {
    return p.il2cppApi.il2cpp_class_get_element_class(this);
  }
  getDeclaringType() {
    return p.il2cppApi.il2cpp_class_get_declaring_type(this);
  }
  filedCount() {
    return p.il2cppApi.il2cpp_class_num_fields(this);
  }
  getEnumBaseType() {
    return p.il2cppApi.il2cpp_class_enum_basetype(this);
  }
  getFieldsInfo(e) {
    return p.il2cppApi.il2cpp_class_get_fields(this, e);
  }
  getProperties(e) {
    return p.il2cppApi.il2cpp_class_get_properties(this, e);
  }
  getMethods(e) {
    return p.il2cppApi.il2cpp_class_get_methods(this, e);
  }
  getGenericName() {
    let e = this.getType().getName(), p = this.name();
    if (-1 !== p.indexOf("`")) {
      let t = p.split("`");
      p = t[0];
      let i = e.indexOf(p), s = e.substr(i + p.length, e.length - p.length);
      return s === "<System.Object>" ? "<T>" : s;
    }
    return "";
  }
  parent() {
    return new t(p.il2cppApi.il2cpp_class_get_parent(this));
  }
  getInterfaces(e) {
    return p.il2cppApi.il2cpp_class_get_interfaces(this, e);
  }
}

exports.Il2CppClass = t;

},{"../il2cppApi":4,"./NativeStruct":11}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: !0
}), exports.Il2CppFieldInfo = void 0;

const e = require("./NativeStruct"), t = require("../il2cppApi"), i = require("./utils");

class p extends e.NativeStruct {
  getFlags() {
    return t.il2cppApi.il2cpp_field_get_flags(this);
  }
  getType() {
    return t.il2cppApi.il2cpp_field_get_type(this);
  }
  getStaticValue() {
    let e = Memory.alloc(Process.pointerSize);
    return t.il2cppApi.il2cpp_field_static_get_value(this, e), i.utils.readTypeEnumValue(e, this.getType().getTypeEnum(), this.getFiledClass());
  }
  getFiledClass() {
    let e = this.getType();
    return t.il2cppApi.il2cpp_class_from_type(e);
  }
  getFiledName() {
    return t.il2cppApi.il2cpp_field_get_name(this).readCString();
  }
  getOffset() {
    return t.il2cppApi.il2cpp_field_get_offset(this);
  }
}

exports.Il2CppFieldInfo = p;

},{"../il2cppApi":4,"./NativeStruct":11,"./utils":13}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: !0
}), exports.Il2CppImage = void 0;

const e = require("./NativeStruct"), t = require("../il2cppApi"), r = require("./structItem"), i = require("../../config"), n = require("./Il2CppClass");

let s = new Array;

s.push(new r.StructItem("name", Process.pointerSize)), s.push(new r.StructItem("nameNoExt", Process.pointerSize)), 
i.UNITY_VER === i.UnityVer.V_2017_4_31f1 ? s.push(new r.StructItem("assemblyIndex", 4)) : s.push(new r.StructItem("assemblyIndex", Process.pointerSize)), 
s.push(new r.StructItem("typeStart", 4)), s.push(new r.StructItem("typeCount", 4)), 
s.push(new r.StructItem("exportedTypeStart", 4));

class p extends e.NativeStruct {
  name() {
    return t.il2cppApi.il2cpp_image_get_name(this).readCString();
  }
  nameNoExt() {
    return this.name().replace(".dll", "");
  }
  typeStart() {
    return this.get("typeStart").readPointer().toInt32();
  }
  typeCount() {
    return t.il2cppApi.il2cpp_image_get_class_count(this);
  }
  getOffsetTypeCount() {
    return this.get("typeCount").readPointer().toInt32();
  }
  getClass(e) {
    let r = Module.findBaseAddress(i.soName);
    if (i.UNITY_VER === i.UnityVer.V_2017_4_31f1) {
      if (void 0 === i.FromTypeDefinition_Addr) throw new Error("current Unity Ver is 2017.4.31f1 you must target FromTypeDefinition address");
      let t = new NativeFunction(r.add(i.FromTypeDefinition_Addr), "pointer", [ "int" ])(this.typeStart() + e);
      return new n.Il2CppClass(t);
    }
    return t.il2cppApi.il2cpp_image_get_class(this, e);
  }
  get(e) {
    return this.add((0, r.getStructOffset)(s, e));
  }
}

exports.Il2CppImage = p;

},{"../../config":1,"../il2cppApi":4,"./Il2CppClass":5,"./NativeStruct":11,"./structItem":12}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: !0
}), exports.Il2CppPropertyInfo = void 0;

const e = require("./NativeStruct"), t = require("../il2cppApi");

class p extends e.NativeStruct {
  getMethod() {
    return t.il2cppApi.il2cpp_property_get_get_method(this);
  }
  setMethod() {
    return t.il2cppApi.il2cpp_property_get_set_method(this);
  }
  getName() {
    return t.il2cppApi.il2cpp_property_get_name(this).readCString();
  }
}

exports.Il2CppPropertyInfo = p;

},{"../il2cppApi":4,"./NativeStruct":11}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: !0
}), exports.Il2CppType = void 0;

const e = require("./NativeStruct"), p = require("../il2cppApi"), t = require("../../logger");

class r extends e.NativeStruct {
  getName() {
    return p.il2cppApi.il2cpp_type_get_name(this).readCString();
  }
  getTypeEnum() {
    return p.il2cppApi.il2cpp_type_get_type(this);
  }
  byref() {
    let e = p.il2cppApi.il2cpp_type_is_byref(this);
    return (0, t.log)(" il2cppTypeIsByref:" + e), e;
  }
}

exports.Il2CppType = r;

},{"../../logger":16,"../il2cppApi":4,"./NativeStruct":11}],10:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: !0
}), exports.MethodInfo = void 0;

const t = require("./NativeStruct"), e = require("../il2cppApi"), p = 76;

class r extends t.NativeStruct {
  getFlags() {
    return e.il2cppApi.il2cpp_method_get_flags(this, 0);
  }
  getMethodPointer() {
    return e.il2cppApi.il2cpp_method_get_pointer(this);
  }
  getSlot() {
    return this.add(76).readU16();
  }
  name() {
    return e.il2cppApi.il2cpp_method_get_name(this).readCString();
  }
  getParamCount() {
    return e.il2cppApi.il2cpp_method_get_param_count(this);
  }
  getParam(t) {
    return e.il2cppApi.il2cpp_method_get_param(this, t);
  }
  getParamName(t) {
    return e.il2cppApi.il2cpp_method_get_param_name(this, t).readCString();
  }
  getReturnType() {
    return e.il2cppApi.il2cpp_method_get_return_type(this);
  }
}

exports.MethodInfo = r;

},{"../il2cppApi":4,"./NativeStruct":11}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: !0
}), exports.NativeStruct = void 0;

class e extends NativePointer {
  constructor(e) {
    super(e);
  }
}

exports.NativeStruct = e;

},{}],12:[function(require,module,exports){
"use strict";

function t(t, e) {
  this.param = t, this.size = e;
}

function e(t, e) {
  let r = 0;
  for (let s = 0; s < t.length; s++) {
    let o = t[s], i = o.param, u = o.size;
    if (i === e) return 0 === s ? 0 : r;
    r += u;
  }
}

Object.defineProperty(exports, "__esModule", {
  value: !0
}), exports.getStructOffset = exports.StructItem = void 0, exports.StructItem = t, 
exports.getStructOffset = e;

},{}],13:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: !0
}), exports.utils = void 0;

const e = require("../Il2CppTypeEnum"), T = require("../tabledefs");

exports.utils = {
  readTypeEnumValue: function(T, E, _) {
    switch (E) {
     case e.Il2CppTypeEnum.IL2CPP_TYPE_BOOLEAN:
      return !!T.readS8();

     case e.Il2CppTypeEnum.IL2CPP_TYPE_I1:
      return T.readS8();

     case e.Il2CppTypeEnum.IL2CPP_TYPE_I2:
      return T.readS16();

     case e.Il2CppTypeEnum.IL2CPP_TYPE_U2:
      return T.readU16();

     case e.Il2CppTypeEnum.IL2CPP_TYPE_I4:
      return T.readS32();

     case e.Il2CppTypeEnum.IL2CPP_TYPE_U4:
      return T.readU32();

     case e.Il2CppTypeEnum.IL2CPP_TYPE_CHAR:
      return T.readU16();

     case e.Il2CppTypeEnum.IL2CPP_TYPE_I8:
      return T.readS64();

     case e.Il2CppTypeEnum.IL2CPP_TYPE_U8:
      return T.readU64();

     case e.Il2CppTypeEnum.IL2CPP_TYPE_R4:
      return T.readFloat();

     case e.Il2CppTypeEnum.IL2CPP_TYPE_R8:
      return T.readDouble();

     case e.Il2CppTypeEnum.IL2CPP_TYPE_VALUETYPE:
      return _.getEnumBaseType().getTypeEnum() === e.Il2CppTypeEnum.IL2CPP_TYPE_I4 ? T.readS32() : null;

     default:
      return null;
    }
  },
  get_method_modifier: function(e) {
    let E;
    switch (e & T.Tabledefs.METHOD_ATTRIBUTE_MEMBER_ACCESS_MASK) {
     case T.Tabledefs.METHOD_ATTRIBUTE_PRIVATE:
      E = "private ";
      break;

     case T.Tabledefs.METHOD_ATTRIBUTE_PUBLIC:
      E = "public ";
      break;

     case T.Tabledefs.METHOD_ATTRIBUTE_FAMILY:
      E = "protected ";
      break;

     case T.Tabledefs.METHOD_ATTRIBUTE_ASSEM:
     case T.Tabledefs.METHOD_ATTRIBUTE_FAM_AND_ASSEM:
      E = "internal ";
      break;

     case T.Tabledefs.METHOD_ATTRIBUTE_FAM_OR_ASSEM:
      E = "protected internal ";
    }
    return e & T.Tabledefs.METHOD_ATTRIBUTE_STATIC && (E += "static "), e & T.Tabledefs.METHOD_ATTRIBUTE_ABSTRACT ? (E += "abstract ", 
    (e & T.Tabledefs.METHOD_ATTRIBUTE_VTABLE_LAYOUT_MASK) === T.Tabledefs.METHOD_ATTRIBUTE_REUSE_SLOT && (E += "override ")) : e & T.Tabledefs.METHOD_ATTRIBUTE_FINAL ? (e & T.Tabledefs.METHOD_ATTRIBUTE_VTABLE_LAYOUT_MASK) === T.Tabledefs.METHOD_ATTRIBUTE_REUSE_SLOT && (E += "sealed override ") : e & T.Tabledefs.METHOD_ATTRIBUTE_VIRTUAL && ((e & T.Tabledefs.METHOD_ATTRIBUTE_VTABLE_LAYOUT_MASK) === T.Tabledefs.METHOD_ATTRIBUTE_NEW_SLOT ? E += "virtual " : E += "override "), 
    e & T.Tabledefs.METHOD_ATTRIBUTE_PINVOKE_IMPL && (E += "extern "), E;
  }
};

},{"../Il2CppTypeEnum":3,"../tabledefs":14}],14:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: !0
}), exports.Tabledefs = void 0, exports.Tabledefs = {
  TYPE_ATTRIBUTE_SERIALIZABLE: 8192,
  TYPE_ATTRIBUTE_VISIBILITY_MASK: 7,
  TYPE_ATTRIBUTE_NOT_PUBLIC: 0,
  TYPE_ATTRIBUTE_PUBLIC: 1,
  TYPE_ATTRIBUTE_NESTED_PUBLIC: 2,
  TYPE_ATTRIBUTE_NESTED_PRIVATE: 3,
  TYPE_ATTRIBUTE_NESTED_FAMILY: 4,
  TYPE_ATTRIBUTE_NESTED_ASSEMBLY: 5,
  TYPE_ATTRIBUTE_NESTED_FAM_AND_ASSEM: 6,
  TYPE_ATTRIBUTE_NESTED_FAM_OR_ASSEM: 7,
  TYPE_ATTRIBUTE_ABSTRACT: 128,
  TYPE_ATTRIBUTE_SEALED: 256,
  TYPE_ATTRIBUTE_SPECIAL_NAME: 1024,
  TYPE_ATTRIBUTE_CLASS_SEMANTIC_MASK: 32,
  TYPE_ATTRIBUTE_CLASS: 0,
  TYPE_ATTRIBUTE_INTERFACE: 32,
  FIELD_ATTRIBUTE_FIELD_ACCESS_MASK: 7,
  FIELD_ATTRIBUTE_COMPILER_CONTROLLED: 0,
  FIELD_ATTRIBUTE_PRIVATE: 1,
  FIELD_ATTRIBUTE_FAM_AND_ASSEM: 2,
  FIELD_ATTRIBUTE_ASSEMBLY: 3,
  FIELD_ATTRIBUTE_FAMILY: 4,
  FIELD_ATTRIBUTE_FAM_OR_ASSEM: 5,
  FIELD_ATTRIBUTE_PUBLIC: 6,
  FIELD_ATTRIBUTE_STATIC: 16,
  FIELD_ATTRIBUTE_INIT_ONLY: 32,
  FIELD_ATTRIBUTE_LITERAL: 64,
  FIELD_ATTRIBUTE_NOT_SERIALIZED: 128,
  FIELD_ATTRIBUTE_SPECIAL_NAME: 512,
  FIELD_ATTRIBUTE_PINVOKE_IMPL: 8192,
  FIELD_ATTRIBUTE_RESERVED_MASK: 38144,
  FIELD_ATTRIBUTE_RT_SPECIAL_NAME: 1024,
  FIELD_ATTRIBUTE_HAS_FIELD_MARSHAL: 4096,
  FIELD_ATTRIBUTE_HAS_DEFAULT: 32768,
  FIELD_ATTRIBUTE_HAS_FIELD_RVA: 256,
  METHOD_IMPL_ATTRIBUTE_CODE_TYPE_MASK: 3,
  METHOD_IMPL_ATTRIBUTE_IL: 0,
  METHOD_IMPL_ATTRIBUTE_NATIVE: 1,
  METHOD_IMPL_ATTRIBUTE_OPTIL: 2,
  METHOD_IMPL_ATTRIBUTE_RUNTIME: 3,
  METHOD_IMPL_ATTRIBUTE_MANAGED_MASK: 4,
  METHOD_IMPL_ATTRIBUTE_UNMANAGED: 4,
  METHOD_IMPL_ATTRIBUTE_MANAGED: 0,
  METHOD_IMPL_ATTRIBUTE_FORWARD_REF: 16,
  METHOD_IMPL_ATTRIBUTE_PRESERVE_SIG: 128,
  METHOD_IMPL_ATTRIBUTE_INTERNAL_CALL: 4096,
  METHOD_IMPL_ATTRIBUTE_SYNCHRONIZED: 32,
  METHOD_IMPL_ATTRIBUTE_NOINLINING: 8,
  METHOD_IMPL_ATTRIBUTE_MAX_METHOD_IMPL_VAL: 65535,
  METHOD_ATTRIBUTE_MEMBER_ACCESS_MASK: 7,
  METHOD_ATTRIBUTE_COMPILER_CONTROLLED: 0,
  METHOD_ATTRIBUTE_PRIVATE: 1,
  METHOD_ATTRIBUTE_FAM_AND_ASSEM: 2,
  METHOD_ATTRIBUTE_ASSEM: 3,
  METHOD_ATTRIBUTE_FAMILY: 4,
  METHOD_ATTRIBUTE_FAM_OR_ASSEM: 5,
  METHOD_ATTRIBUTE_PUBLIC: 6,
  METHOD_ATTRIBUTE_STATIC: 16,
  METHOD_ATTRIBUTE_FINAL: 32,
  METHOD_ATTRIBUTE_VIRTUAL: 64,
  METHOD_ATTRIBUTE_HIDE_BY_SIG: 128,
  METHOD_ATTRIBUTE_VTABLE_LAYOUT_MASK: 256,
  METHOD_ATTRIBUTE_REUSE_SLOT: 0,
  METHOD_ATTRIBUTE_NEW_SLOT: 256,
  METHOD_ATTRIBUTE_STRICT: 512,
  METHOD_ATTRIBUTE_ABSTRACT: 1024,
  METHOD_ATTRIBUTE_SPECIAL_NAME: 2048,
  METHOD_ATTRIBUTE_PINVOKE_IMPL: 8192,
  METHOD_ATTRIBUTE_UNMANAGED_EXPORT: 8,
  METHOD_ATTRIBUTE_RESERVED_MASK: 53248,
  METHOD_ATTRIBUTE_RT_SPECIAL_NAME: 4096,
  METHOD_ATTRIBUTE_HAS_SECURITY: 16384,
  METHOD_ATTRIBUTE_REQUIRE_SEC_OBJECT: 32768
};

},{}],15:[function(require,module,exports){
(function (setImmediate){(function (){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: !0
});

const e = require("./dumper");

function t() {
  e.dumper.start();
}

setImmediate(t);

}).call(this)}).call(this,require("timers").setImmediate)

},{"./dumper":2,"timers":18}],16:[function(require,module,exports){
"use strict";

function e(e) {
  console.log(e);
}

Object.defineProperty(exports, "__esModule", {
  value: !0
}), exports.log = void 0, exports.log = e;

},{}],17:[function(require,module,exports){
var t, e, n = module.exports = {};

function r() {
  throw new Error("setTimeout has not been defined");
}

function o() {
  throw new Error("clearTimeout has not been defined");
}

function i(e) {
  if (t === setTimeout) return setTimeout(e, 0);
  if ((t === r || !t) && setTimeout) return t = setTimeout, setTimeout(e, 0);
  try {
    return t(e, 0);
  } catch (n) {
    try {
      return t.call(null, e, 0);
    } catch (n) {
      return t.call(this, e, 0);
    }
  }
}

function u(t) {
  if (e === clearTimeout) return clearTimeout(t);
  if ((e === o || !e) && clearTimeout) return e = clearTimeout, clearTimeout(t);
  try {
    return e(t);
  } catch (n) {
    try {
      return e.call(null, t);
    } catch (n) {
      return e.call(this, t);
    }
  }
}

!function() {
  try {
    t = "function" == typeof setTimeout ? setTimeout : r;
  } catch (e) {
    t = r;
  }
  try {
    e = "function" == typeof clearTimeout ? clearTimeout : o;
  } catch (t) {
    e = o;
  }
}();

var c, s = [], l = !1, a = -1;

function f() {
  l && c && (l = !1, c.length ? s = c.concat(s) : a = -1, s.length && h());
}

function h() {
  if (!l) {
    var t = i(f);
    l = !0;
    for (var e = s.length; e; ) {
      for (c = s, s = []; ++a < e; ) c && c[a].run();
      a = -1, e = s.length;
    }
    c = null, l = !1, u(t);
  }
}

function m(t, e) {
  this.fun = t, this.array = e;
}

function p() {}

n.nextTick = function(t) {
  var e = new Array(arguments.length - 1);
  if (arguments.length > 1) for (var n = 1; n < arguments.length; n++) e[n - 1] = arguments[n];
  s.push(new m(t, e)), 1 !== s.length || l || i(h);
}, m.prototype.run = function() {
  this.fun.apply(null, this.array);
}, n.title = "browser", n.browser = !0, n.env = {}, n.argv = [], n.version = "", 
n.versions = {}, n.on = p, n.addListener = p, n.once = p, n.off = p, n.removeListener = p, 
n.removeAllListeners = p, n.emit = p, n.prependListener = p, n.prependOnceListener = p, 
n.listeners = function(t) {
  return [];
}, n.binding = function(t) {
  throw new Error("process.binding is not supported");
}, n.cwd = function() {
  return "/";
}, n.chdir = function(t) {
  throw new Error("process.chdir is not supported");
}, n.umask = function() {
  return 0;
};

},{}],18:[function(require,module,exports){
(function (setImmediate,clearImmediate){(function (){
var e = require("process/browser.js").nextTick, t = Function.prototype.apply, o = Array.prototype.slice, i = {}, n = 0;

function r(e, t) {
  this._id = e, this._clearFn = t;
}

exports.setTimeout = function() {
  return new r(t.call(setTimeout, window, arguments), clearTimeout);
}, exports.setInterval = function() {
  return new r(t.call(setInterval, window, arguments), clearInterval);
}, exports.clearTimeout = exports.clearInterval = function(e) {
  e.close();
}, r.prototype.unref = r.prototype.ref = function() {}, r.prototype.close = function() {
  this._clearFn.call(window, this._id);
}, exports.enroll = function(e, t) {
  clearTimeout(e._idleTimeoutId), e._idleTimeout = t;
}, exports.unenroll = function(e) {
  clearTimeout(e._idleTimeoutId), e._idleTimeout = -1;
}, exports._unrefActive = exports.active = function(e) {
  clearTimeout(e._idleTimeoutId);
  var t = e._idleTimeout;
  t >= 0 && (e._idleTimeoutId = setTimeout((function() {
    e._onTimeout && e._onTimeout();
  }), t));
}, exports.setImmediate = "function" == typeof setImmediate ? setImmediate : function(t) {
  var r = n++, l = !(arguments.length < 2) && o.call(arguments, 1);
  return i[r] = !0, e((function() {
    i[r] && (l ? t.apply(null, l) : t.call(null), exports.clearImmediate(r));
  })), r;
}, exports.clearImmediate = "function" == typeof clearImmediate ? clearImmediate : function(e) {
  delete i[e];
};

}).call(this)}).call(this,require("timers").setImmediate,require("timers").clearImmediate)

},{"process/browser.js":17,"timers":18}]},{},[15])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZ2VudC9jb25maWcudHMiLCJhZ2VudC9kdW1wZXIuanMiLCJhZ2VudC9pbDJjcHAvSWwyQ3BwVHlwZUVudW0uanMiLCJhZ2VudC9pbDJjcHAvaWwyY3BwQXBpLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9JbDJDcHBDbGFzcy5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvSWwyQ3BwRmllbGRJbmZvLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9JbDJDcHBJbWFnZS5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvSWwyQ3BwUHJvcGVydHlJbmZvLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9JbDJDcHBUeXBlLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9NZXRob2RJbmZvLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9OYXRpdmVTdHJ1Y3QuanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L3N0cnVjdEl0ZW0uanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L3V0aWxzLmpzIiwiYWdlbnQvaWwyY3BwL3RhYmxlZGVmcy5qcyIsImFnZW50L2luZGV4LnRzIiwiYWdlbnQvbG9nZ2VyLnRzIiwibm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy90aW1lcnMtYnJvd3NlcmlmeS9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7QUNsQ0EsTUFBYSxVQUFxQjtFQUU5QixZQUFZO0lBQ1IsTUFBTTs7OztBQUhkLFFBQUEsZUFBQTs7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7O0FDOUVBLE1BQUEsSUFBQSxRQUFBOztBQUtBLFNBQVM7RUFDTixFQUFBLE9BQU87OztBQUhWLGFBQWE7Ozs7O0FDSmI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIifQ==
