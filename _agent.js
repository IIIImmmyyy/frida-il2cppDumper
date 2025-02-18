(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElfDumper = exports.SoInfo = exports.ElfFile = exports.elf64_shdr = void 0;
const logger_1 = require("./logger");
const readlink = new NativeFunction(Module.findExportByName(null, 'readlink'), 'int', ['pointer', 'pointer', 'int']);
let curBuff;
let allBuff;
let lastLength = 0;
let MapFileCache = {};
let MapFileCallNum = 0;
let mmapCache = {};
let mmapCallNum = 0;
let sectionHeader = null;
let sectionHeaderNum = 0;
let e_shoff = 0;
function page_offset(offset) {
    return offset & (4096 - 1);
}
class elf64_shdr extends NativePointer {
    constructor(pointer) {
        super(pointer);
    }
    sh_size() {
        return this.add(32).readU64();
    }
    sh_entsize() {
        return this.add(56).readU64();
    }
    sh_type() {
        return this.add(0x4).readU32();
    }
}
exports.elf64_shdr = elf64_shdr;
class ElfFile extends NativePointer {
    constructor(pointer) {
        super(pointer);
    }
    e_shnum() {
        return this.add(0x3c).readU16();
    }
    e_shoff() {
        return this.add(0x28).readU64();
    }
}
exports.ElfFile = ElfFile;
class SoInfo extends NativePointer {
    constructor(pointer) {
        super(pointer);
    }
    phnum() {
        return this.add(0x8).readU64();
    }
    base() {
        return this.add(0x10).readU64().toString(0x10);
    }
    size() {
        return this.add(0x18).readU64();
    }
}
exports.SoInfo = SoInfo;
exports.ElfDumper = {
    findmmap: function () {
        let module = Process.findModuleByName("linker64");
        let moduleSymbolDetails = module.enumerateSymbols();
        for (let i = 0; i < moduleSymbolDetails.length; i++) {
            let symbol = moduleSymbolDetails[i];
            if (symbol.name === "__dl_mmap64") {
                return symbol.address;
            }
        }
    },
    findMappedFileFragment_Map: function () {
        let module = Process.findModuleByName("linker64");
        let moduleSymbolDetails = module.enumerateSymbols();
        for (let i = 0; i < moduleSymbolDetails.length; i++) {
            let symbol = moduleSymbolDetails[i];
            if (symbol.name === "__dl__ZN18MappedFileFragment3MapEilmm") {
                return symbol.address;
            }
        }
    },
    getPathByFd: function (fd) {
        const path = `/proc/self/fd/${fd}`;
        const buffer = Memory.alloc(1024);
        const pathPtr = Memory.allocUtf8String(path);
        const result = readlink(pathPtr, buffer, 1024);
        if (result === -1) {
            throw new Error('Unable to get path for fd: ' + fd);
        }
        return buffer.readUtf8String(result);
    },
    start: function (soname, outPath) {
        let nativePointer = this.findmmap();
        let mmap64 = new NativeFunction(nativePointer, 'pointer', ['pointer', 'size_t', 'int', 'int', 'int', 'int']);
        Interceptor.replace(nativePointer, new NativeCallback(function (addr, length, prot, flags, fd, offset) {
            let ptr = mmap64(addr, length, prot, flags, fd, offset);
            if (fd !== -1) {
                let path = exports.ElfDumper.getPathByFd(fd);
                if (path.includes(soname)) {
                    // log("Found so file: " + path);
                    (0, logger_1.log)("ptr is: " + ptr + " addr ? " + addr + " offset " + offset);
                    if (mmapCallNum === 0) {
                        let elfFile = new ElfFile(ptr);
                        sectionHeaderNum = elfFile.e_shnum();
                        e_shoff = elfFile.e_shoff();
                        (0, logger_1.log)("sectionHeaderNum " + sectionHeaderNum + " e_shoff " + e_shoff);
                    }
                    if (mmapCallNum === 1) {
                        //find Section header
                        (0, logger_1.log)("find Section header" + addr + " offset " + offset + " length " + length + " page_offset offset " + page_offset(e_shoff));
                        let sectionHeadStart = ptr.add(page_offset(e_shoff));
                        (0, logger_1.logHHexLength)(sectionHeadStart, 128);
                        (0, logger_1.log)("addr ? ");
                        for (let i = 0; i < sectionHeaderNum; i++) {
                            let elf64Shdr = new elf64_shdr(sectionHeadStart.add(i * 0x40));
                            let sh_type = elf64Shdr.sh_type();
                            (0, logger_1.log)("sh_type " + sh_type);
                        }
                    }
                    mmapCallNum++;
                }
            }
            return ptr;
        }, 'pointer', ['pointer', 'size_t', 'int', 'int', 'int', 'int']));
        let nativePointer2 = this.findMappedFileFragment_Map();
        let mappedFileFragment_Map = new NativeFunction(nativePointer2, 'bool', ['pointer', 'int', 'int64', 'size_t', 'size_t']);
        Interceptor.replace(nativePointer2, new NativeCallback(function (self, fd, base_offset, elf_offset, size) {
            let b = mappedFileFragment_Map(self, fd, base_offset, elf_offset, size);
            if (fd !== -1) {
                let path = exports.ElfDumper.getPathByFd(fd);
                if (path.includes(soname)) {
                    if (MapFileCallNum === 1) {
                        //find Section header
                        (0, logger_1.log)("mappedFileFragment_Map find Section header" + path + " base_offset " + base_offset + " elf_offset " + elf_offset + " length " + size);
                    }
                    MapFileCallNum++;
                }
            }
            return b;
        }, 'bool', ['pointer', 'int', 'int64', 'size_t', 'size_t']));
        setTimeout(function () {
            let module = Process.findModuleByName(soname);
            let elfFile = new ElfFile(module.base);
        }, 2000);
    }
};
},{"./logger":29}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZipUtils = void 0;
exports.ZipUtils = {
    test: function () {
        this.zipFolder("/data/data/com.tencent.ro/files/Script", "/data/data/com.tencent.ro/files/Script.zip");
    },
    zipFolder: function (folderPath, outputPath, callback) {
        return Java.perform(function () {
            var Thread = Java.use('java.lang.Thread');
            var Runnable = Java.registerClass({
                // 实现Runnable接口
                name: 'com.example.ZipRunnable',
                implements: [Java.use('java.lang.Runnable')],
                methods: {
                    run: function () {
                        var FileOutputStream = Java.use('java.io.FileOutputStream');
                        var ZipOutputStream = Java.use('java.util.zip.ZipOutputStream');
                        var ZipEntry = Java.use('java.util.zip.ZipEntry');
                        var FileInputStream = Java.use('java.io.FileInputStream');
                        var File = Java.use('java.io.File');
                        var totalFiles = 0;
                        var processedFiles = 0;
                        var fos = FileOutputStream.$new(outputPath);
                        var zos = ZipOutputStream.$new(fos);
                        function countFiles(file) {
                            if (file.isDirectory()) {
                                var files = file.listFiles();
                                for (var i = 0; i < files.length; i++) {
                                    countFiles(files[i]);
                                }
                            }
                            else {
                                totalFiles++;
                            }
                        }
                        function addFileToZip(file, parentDir) {
                            if (file.isDirectory()) {
                                var files = file.listFiles();
                                for (var i = 0; i < files.length; i++) {
                                    addFileToZip(files[i], parentDir + file.getName() + "/");
                                }
                            }
                            else {
                                var entryName = parentDir + file.getName();
                                var entry = ZipEntry.$new(entryName);
                                zos.putNextEntry(entry);
                                var fis = FileInputStream.$new(file.getAbsolutePath());
                                var buffer = Java.array('byte', Array(1024).fill(0));
                                var length;
                                while ((length = fis.read(buffer)) != -1) {
                                    zos.write(buffer, 0, length);
                                }
                                fis.close();
                                zos.closeEntry();
                                processedFiles++;
                                console.log("Doing Cpp2IL files Zip one Folder Progress: " + (processedFiles / totalFiles * 100).toFixed(2) + "%");
                            }
                        }
                        var folder = File.$new(folderPath);
                        if (!folder.isDirectory()) {
                            throw new Error('Provided path is not a directory');
                        }
                        countFiles(folder);
                        addFileToZip(folder, "");
                        zos.close();
                        fos.close();
                        // 如果没有错误发生，调用回调函数并指示成功
                        Java.scheduleOnMainThread(function () {
                            callback(true);
                        });
                    }
                }
            });
            var thread = Thread.$new(Runnable.$new());
            thread.start();
        });
    }
};
},{}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoName = void 0;
exports.SoName = "libil2cpp.so";
},{}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNetProtect = exports.useSoInfo = exports.CSFileDir = exports.ZipOutCSFile = exports.OutCSFile = exports.DUMP_FILE_PATH = exports.path = exports.soName = exports.IOSDumpName = exports.UNITY_VER = exports.UnityVer = exports.pkg_name = void 0;
exports.pkg_name = "com.zzonegame.aresvirus2.android";
exports.UnityVer = {
    V_2017_4_31f1: "2017.4.31f1",
    V_2018_4_36f1: "2018.4.36f1",
    V_2020: "2020",
};
exports.UNITY_VER = exports.UnityVer.V_2018_4_36f1;
exports.IOSDumpName = "UnityFramework";
exports.soName = "libil2cpp.so";
exports.path = "/data/data/" + exports.pkg_name;
exports.DUMP_FILE_PATH = exports.path + "/dump.cs";
exports.OutCSFile = true;
exports.ZipOutCSFile = true;
exports.CSFileDir = "/data/data/" + exports.pkg_name + "/files/Script";
exports.useSoInfo = false;
exports.isNetProtect = false;
},{}],5:[function(require,module,exports){
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
const ZipUtils_1 = require("./and/ZipUtils");
const LinkerHelper_1 = require("./linker/LinkerHelper");
let classAllCount = 0;
console.log("platform:" + Process.platform);
let file = undefined;
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
        if (Process.platform === "darwin") {
            dumpconfig_1.soName = dumpconfig_1.IOSDumpName;
        }
        if (dumpconfig_1.isNetProtect) {
            LinkerHelper_1.linkerHelper.initSymbol();
        }
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
                let isInterpreterImage = Il2CppImage.IsInterpreterImage();
                if (!isInterpreterImage) {
                    exports.dumper.out(" // Image :" + i + " " + Il2CppImage.nameNoExt() + " - " + Il2CppImage.typeStart() + "\n");
                }
                else {
                    exports.dumper.out(" // Image :" + i + " " + Il2CppImage.nameNoExt() + " - " + Il2CppImage.typeStart() + "---> HybridCLR Dll\n");
                }
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
            // if (il2cppApi.nativeFunNotExistMap.size > 0) {
            //     // log("some NativeFun is un exist ,parser will be not accurate :");
            //     il2cppApi.nativeFunNotExistMap.forEach(function (value, key) {
            //         log(key + "");
            //     })
            // }
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
            else {
                if (dumpconfig_1.OutCSFile && Process.platform === "linux") {
                    if (dumpconfig_1.ZipOutCSFile) {
                        ZipUtils_1.ZipUtils.zipFolder(dumpconfig_1.CSFileDir, dumpconfig_1.CSFileDir + ".zip", function (ok) {
                            if (ok) {
                                // log("zip success");
                                (0, logger_1.log)("this is in Android platform  out path is in " + dumpconfig_1.DUMP_FILE_PATH);
                                (0, logger_1.log)("Cpp2IL Zip Done Path:" + dumpconfig_1.CSFileDir + ".zip");
                            }
                            else {
                                (0, logger_1.log)("zip error");
                            }
                        });
                    }
                    else {
                        (0, logger_1.log)("Cpp2IL Zip Done Path:" + dumpconfig_1.CSFileDir);
                    }
                }
                else {
                    (0, logger_1.log)("this is in Android platform  out path is in " + dumpconfig_1.DUMP_FILE_PATH);
                }
            }
        }, 5000);
    },
    findAllClass: function (il2cppImage) {
        let class_count = il2cppImage.typeCount();
        (0, logger_1.log)("findAllClass " + il2cppImage.name() + "  class_count:" + class_count);
        for (let i = 0; i < class_count; i++) {
            (0, logger_1.log)("class process:" + (i + 1) + "/" + class_count + " in " + il2cppImage.name());
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
                let name = propertyInfo.getName();
                if (name !== "") {
                    out += "// unknow property:" + name + "\n";
                }
                continue;
            }
            if (!method.isNull()) {
                if (klass.name() === "JSONNode"
                    || klass.name() === "LCRole") {
                    continue;
                }
                let methodModifier = utils_1.utils.get_method_modifier(method.getFlags());
                // let methodPointer = method.getMethodPointer()
                // log("methodModifier:" + methodModifier + " methodPointer:" + methodPointer);
                out += methodModifier;
                try {
                    pro_class = il2cppApi_1.il2cppApi.il2cpp_class_from_type(method.getReturnType());
                }
                catch (e) {
                    pro_class = null;
                }
            }
            else if (!setMethod.isNull()) {
                let setModifier = utils_1.utils.get_method_modifier(setMethod.getFlags());
                out += setModifier;
                pro_class = il2cppApi_1.il2cppApi.il2cpp_class_from_type(setMethod.getReturnType());
            }
            if (pro_class === null) {
                out += "// unknow type : " + method.name();
                (0, logger_1.log)("unknow type: " + klass.name());
            }
            else {
                out += exports.dumper.parserType(pro_class.getType()) + " " + propertyInfo.getName() + " { ";
                if (!method.isNull()) {
                    out += "get; ";
                }
                if (!setMethod.isNull()) {
                    out += "set; ";
                }
                out += "}\n";
            }
            // log("pro_class:"+pro_class +"propertyInfo:"+propertyInfo.getName() +" method:"+method +" setMethod:"+setMethod)
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
                let isConst = false;
                if (flags & tabledefs_1.Tabledefs.FIELD_ATTRIBUTE_LITERAL) {
                    if (!enumType) {
                        out += "const ";
                        isConst = true;
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
                else if (isConst) {
                    let staticValue = filedInfo.getStaticValue();
                    if (staticValue !== null) {
                        out += " = " + staticValue;
                    }
                    out += ";\n";
                }
                else {
                    out += " ;// 0x" + offset.toString(16).toUpperCase() + "\n";
                }
            }
        }
        return out;
    },
    out: function (string) {
        if (file === undefined) {
            if (Process.platform === "darwin") {
                let documentDir = IOSUtils_1.IOSUtils.getDocumentDir();
                file = new File(documentDir + "/dump.cs", "wb");
            }
            else {
                (0, logger_1.log)("android dump path " + dumpconfig_1.DUMP_FILE_PATH);
                file = new File(dumpconfig_1.DUMP_FILE_PATH, "wb");
            }
        }
        file.write(string);
        file.flush();
    }
};
},{"./and/ZipUtils":2,"./dumpconfig":4,"./il2cpp/CSFileOut":7,"./il2cpp/Il2CppTypeEnum":9,"./il2cpp/il2cppApi":11,"./il2cpp/struct/utils":23,"./il2cpp/tabledefs":24,"./ios/IOSUtils":26,"./linker/LinkerHelper":27,"./logger":29}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hooklinker = void 0;
const logger_1 = require("./logger");
let once = false;
exports.hooklinker = {
    startByCtor: function (obsName, logpath, callBack) {
        let module;
        if (Process.pointerSize === 8) {
            module = Process.findModuleByName("linker64");
        }
        else {
            module = Process.findModuleByName("linker");
        }
        (0, logger_1.log)("got module " + module.name);
        let call_ctorAddr;
        let moduleSymbolDetails = module.enumerateSymbols();
        for (let i = 0; i < moduleSymbolDetails.length; i++) {
            if (moduleSymbolDetails[i].name.includes("__dl__ZN6soinfo17call_constructorsEv")) {
                call_ctorAddr = moduleSymbolDetails[i].address;
                break;
            }
        }
        let realPathAddr;
        for (let i = 0; i < moduleSymbolDetails.length; i++) {
            if (moduleSymbolDetails[i].name.includes("__dl__ZNK6soinfo12get_realpathEv")) {
                realPathAddr = moduleSymbolDetails[i].address;
                break;
            }
        }
        if (call_ctorAddr != null) {
            Interceptor.attach(call_ctorAddr, {
                onEnter: function (args) {
                    let soinfo = args[0];
                    let path;
                    if (realPathAddr !== null && realPathAddr !== undefined) {
                        let s = new NativeFunction(realPathAddr, 'pointer', ['pointer'])(soinfo);
                        path = s.readCString();
                    }
                    else {
                        //is Android 7.1.1?
                        //use struct
                        path = soinfo.add(0x380).readCString();
                        console.log("path " + path);
                    }
                    if (logpath) {
                        (0, logger_1.log)(path);
                    }
                    if (path.includes(obsName)
                        && !once) {
                        this.hook = true;
                        once = true;
                    }
                },
                onLeave: function (ret) {
                    if (this.hook) {
                        (0, logger_1.log)("linker ctor call ");
                        callBack();
                        // yxz.start();
                    }
                }
            });
        }
        else {
            (0, logger_1.log)("can not find call_ctorAddr or realPathAddr " + call_ctorAddr + " " + realPathAddr
                + "linker path is " + module.path);
        }
    },
    start: function () {
        // linker64 arm64
        if (Process.pointerSize === 8) {
            let module = Process.findModuleByName("linker64");
            Interceptor.attach(module.base.add(0xb5b48), {
                onEnter: function (args) {
                    var path = args[3].readCString();
                    console.log("path " + path);
                    if (path.includes("libjiagu_64.so")) {
                        // HookImpl.start();
                        // Lolm.start()
                        // sqsd.start();
                        // setTimeout(function (){
                        //     //find Export
                        //     log("try to find module by name "+soName)
                        //     let module1 = Process.findModuleByName(soName);
                        //
                        //     let moduleExportDetails = module1.enumerateExports();
                        //
                        //     for (let i = 0; i < moduleExportDetails.length; i++) {
                        //         console.log("Export Name: " + moduleExportDetails[i].name + " Export Address: " + moduleExportDetails[i].address);
                        //     }
                        //
                        // },5000);
                    }
                }
            });
        }
        else {
            //linker
        }
    },
    startBydlopen: function (obsName, logpath, callBack) {
        let module = Process.findModuleByName("linker");
        let moduleSymbolDetails = module.enumerateSymbols();
        let dlopenAddr;
        for (let i = 0; i < moduleSymbolDetails.length; i++) {
            if (moduleSymbolDetails[i].name.includes("__dl__Z9do_dlopenPKciPK17android_dlextinfoPv")) {
                dlopenAddr = moduleSymbolDetails[i].address;
                break;
            }
        }
        Interceptor.attach(dlopenAddr, {
            onEnter: function (args) {
                let path = args[0].readCString();
                if (logpath && path.includes("/data/")) {
                    (0, logger_1.log)(path);
                }
                if (path.includes(obsName)
                    && !once) {
                    this.hook = true;
                    once = true;
                    callBack();
                }
            },
        });
    }
};
},{"./logger":29}],7:[function(require,module,exports){
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
},{"../dumpconfig":4,"./FileUtils":8,"./il2cppApi":11}],8:[function(require,module,exports){
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
},{"../logger":29}],9:[function(require,module,exports){
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
},{}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Il2cppString = void 0;
const NativeStruct_1 = require("../../struct/NativeStruct");
const il2cppApi_1 = require("../../il2cppApi");
class Il2cppString extends NativeStruct_1.NativeStruct {
    static parserString(str) {
        // 获取MonoString的长度
        if (str.isNull()) {
            return "空";
        }
        // logHHex(str)
        let il2CppBase = Process.pointerSize * 2;
        var length = Memory.readU32(str.add(il2CppBase));
        // 获取MonoString的字符数据的指针（UTF-16编码）
        var charsPtr = str.add(il2CppBase + 0x4);
        // 从UTF-16编码的字符数据创建JavaScript字符串
        return Memory.readUtf16String(charsPtr, length);
    }
    static parser(systemString) {
        if (systemString.isNull()) {
            return "指针空";
        }
        let length = il2cppApi_1.il2cppApi.il2cpp_string_length(systemString);
        let il2cppStringChars = il2cppApi_1.il2cppApi.il2cpp_string_chars(systemString);
        let content = "";
        for (let i = 0; i < length; i++) {
            let offset = i * 2;
            let s = il2cppStringChars.add(offset).readU16().toString(16);
            if (s.toString().length === 2) {
                let s2 = il2cppStringChars.add(offset).readCString();
                content = content + s2;
            }
            else {
                //转换unicode
                let unicode = "\\u" + s.toString();
                let decodeUnicode1 = this.decodeUnicode(unicode);
                content = content + decodeUnicode1;
            }
        }
        return content;
    }
    getCString() {
        if (this.isNull()) {
            return "指针空";
        }
        let length = this.getLength();
        //长度4字节本身偏移16 从20位开始
        let il2cppStringChars = il2cppApi_1.il2cppApi.il2cpp_string_chars(this);
        let content = "";
        for (let i = 0; i < length; i++) {
            let offset = i * 2;
            let s = il2cppStringChars.add(offset).readU16().toString(16);
            // console.log("il2cppStringChars:" + s);
            //转unicode
            if (s.toString().length === 2) {
                let s2 = il2cppStringChars.add(offset).readCString();
                // log("s2:"+s2);
                content = content + s2;
            }
            else {
                //转换unicode
                let unicode = "\\u" + s.toString();
                // log("unicode:" + unicode);
                let decodeUnicode1 = this.decodeUnicode(unicode);
                content = content + decodeUnicode1;
                // log("s2:"+this.decodeUnicode(unicode));
            }
            // let s1 = String.fromCharCode(unicode);
        }
        if (content === undefined) {
            return "";
        }
        return content;
    }
    getLength() {
        return il2cppApi_1.il2cppApi.il2cpp_string_length(this);
    }
    static decodeUnicode(str) {
        let replace = str.replace(/\\/g, "%");
        return unescape(replace);
    }
}
exports.Il2cppString = Il2cppString;
},{"../../il2cppApi":11,"../../struct/NativeStruct":21}],11:[function(require,module,exports){
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
        // let il2cpp_method_get_pointer = this.load("il2cpp_method_get_pointer", "pointer", ['pointer']);
        // if (il2cpp_method_get_pointer !== undefined) {
        //     return il2cpp_method_get_pointer(method);
        // }
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
        if (dumpconfig_1.useSoInfo || dumpconfig_1.isNetProtect) {
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
                if (nativePointer.isNull() && dumpconfig_1.isNetProtect) {
                    let mappingSymbol = LinkerHelper_1.linkerHelper.findNetProtectMappingSymbol(exportName);
                    nativePointer = dlsym(il2CppHandle, Memory.allocUtf8String(mappingSymbol));
                }
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
},{"../dumpconfig":4,"../linker/LinkerHelper":27,"./struct/Il2CppClass":12,"./struct/Il2CppFieldInfo":13,"./struct/Il2CppImage":17,"./struct/Il2CppPropertyInfo":18,"./struct/Il2CppType":19,"./struct/MethodInfo":20}],12:[function(require,module,exports){
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
},{"../il2cppApi":11,"./Il2CppImage":17,"./NativeStruct":21}],13:[function(require,module,exports){
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
},{"../il2cppApi":11,"./Il2CppClass":12,"./NativeStruct":21,"./utils":23}],14:[function(require,module,exports){
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
},{"./Il2CppGenericInst":15,"./NativeStruct":21}],15:[function(require,module,exports){
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
},{"./NativeStruct":21}],16:[function(require,module,exports){
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
},{"./Il2CppGenericContext":14,"./NativeStruct":21}],17:[function(require,module,exports){
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
let kMetadataIndexBits = 22;
let kMetadataImageIndexExtraShiftBitsA = 6;
let kMetadataImageIndexExtraShiftBitsB = 4;
let kMetadataImageIndexExtraShiftBitsC = 2;
let kMetadataImageIndexExtraShiftBitsD = 0;
let kInvalidIndex = -1;
let kMetadataIndexMaskA = (1 << (kMetadataIndexBits + kMetadataImageIndexExtraShiftBitsA)) - 1;
class Il2CppImage extends NativeStruct_1.NativeStruct {
    name() {
        return il2cppApi_1.il2cppApi.il2cpp_image_get_name(this).readCString();
    }
    token() {
        return this.add(0x40).readU32();
    }
    IsInterpreterImage() {
        let index = this.token();
        // log("got token "+index);
        return index !== kInvalidIndex && (index & ~kMetadataIndexMaskA) !== 0;
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
},{"../../dumpconfig":4,"../il2cppApi":11,"./NativeStruct":21,"./structItem":22}],18:[function(require,module,exports){
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
},{"../il2cppApi":11,"./NativeStruct":21}],19:[function(require,module,exports){
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
},{"../../logger":29,"../il2cppApi":11,"./NativeStruct":21}],20:[function(require,module,exports){
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
},{"../../config":3,"../../logger":29,"../il2cppApi":11,"./Il2CppClass":12,"./Il2CppGenericMethod":16,"./NativeStruct":21}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeStruct = void 0;
class NativeStruct extends NativePointer {
    constructor(pointer) {
        super(pointer);
    }
}
exports.NativeStruct = NativeStruct;
},{}],22:[function(require,module,exports){
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
},{}],23:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.utils = void 0;
const Il2CppTypeEnum_1 = require("../Il2CppTypeEnum");
const tabledefs_1 = require("../tabledefs");
const Il2cppString_1 = require("../hacker/struct/Il2cppString");
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
            case Il2CppTypeEnum_1.Il2CppTypeEnum.IL2CPP_TYPE_STRING:
                return "\"" + Il2cppString_1.Il2cppString.parserString(pointer.readPointer()) + "\"";
            default:
                // log("readTypeEnumValue: unknown typeEnum:" + typeEnum);
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
},{"../Il2CppTypeEnum":9,"../hacker/struct/Il2cppString":10,"../tabledefs":24}],24:[function(require,module,exports){
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
},{}],25:[function(require,module,exports){
(function (setImmediate){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hooklinker_1 = require("./hooklinker");
const safeSelf_1 = require("./safeSelf");
const dumper_1 = require("./dumper");
const LinkerHelper_1 = require("./linker/LinkerHelper");
const dumpconfig_1 = require("./dumpconfig");
setImmediate(main);
function main() {
    safeSelf_1.SafeSelf.start();
    if (dumpconfig_1.isNetProtect) {
        LinkerHelper_1.linkerHelper.init();
        hooklinker_1.hooklinker.startByCtor("libil2cpp.so", false, function () {
            dumper_1.dumper.start();
        });
    }
    else {
        dumper_1.dumper.start();
    }
}
}).call(this)}).call(this,require("timers").setImmediate)

},{"./dumpconfig":4,"./dumper":5,"./hooklinker":6,"./linker/LinkerHelper":27,"./safeSelf":30,"timers":32}],26:[function(require,module,exports){
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
},{}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkerHelper = exports.symbols = exports.Dyn = void 0;
const logger_1 = require("../logger");
const dumpconfig_1 = require("../dumpconfig");
const SoInfo_1 = require("./SoInfo");
const NativeStruct_1 = require("../il2cpp/struct/NativeStruct");
const ElfDumper_1 = require("../ElfDumper");
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
let mmapCallNum = 0;
let enbale_log = false;
class Dyn extends NativeStruct_1.NativeStruct {
    d_tag() {
        return this.readS64();
    }
    d_ptr() {
        return this.readU64();
    }
}
exports.Dyn = Dyn;
let shdr_num;
let shdr_offset;
let symCount;
exports.symbols = [];
function page_offset(offset) {
    return offset & (4096 - 1);
}
exports.linkerHelper = {
    init: function () {
        let nativePointer = ElfDumper_1.ElfDumper.findmmap();
        let mmap64 = new NativeFunction(nativePointer, 'pointer', ['pointer', 'size_t', 'int', 'int', 'int', 'int']);
        Interceptor.replace(nativePointer, new NativeCallback(function (addr, length, prot, flags, fd, offset) {
            let ptr = mmap64(addr, length, prot, flags, fd, offset);
            if (fd !== -1) {
                let path = ElfDumper_1.ElfDumper.getPathByFd(fd);
                if (path.includes(dumpconfig_1.soName)) {
                    // log("Found so file: " + path);
                    if (mmapCallNum === 0) {
                        let elfFile = new ElfDumper_1.ElfFile(ptr);
                        shdr_num = elfFile.e_shnum();
                        shdr_offset = elfFile.e_shoff();
                    }
                    else if (mmapCallNum === 1) {
                        let sectionHeadStart = ptr.add(page_offset(shdr_offset));
                        for (let i = 0; i < shdr_num; i++) {
                            let elf64Shdr = new ElfDumper_1.elf64_shdr(sectionHeadStart.add(i * 0x40));
                            let sh_type = elf64Shdr.sh_type();
                            if (sh_type === 11) {
                                //got size
                                symCount = elf64Shdr.sh_size() / elf64Shdr.sh_entsize();
                            }
                        }
                    }
                    mmapCallNum++;
                }
            }
            return ptr;
        }, 'pointer', ['pointer', 'size_t', 'int', 'int', 'int', 'int']));
    },
    getTargetSoInfo: function (soname) {
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
        let _soinfo = null;
        linker_solist.forEach((soinfo, index) => {
            const realpath = soinfo_get_realpath(soinfo).readCString();
            // log("realpath " + realpath +" soname "+soname);
            if (realpath.includes(soname)) {
                //转换handle
                console.log("find soinfo " + soinfo);
                _soinfo = soinfo;
            }
        });
        return _soinfo;
    },
    findNetProtectMappingSymbol: function (symbol) {
        for (let i = 0; i < exports.symbols.length; i++) {
            if (exports.symbols[i].mapping === symbol) {
                if (enbale_log) {
                    (0, logger_1.log)(" find mapping " + symbol + " " + exports.symbols[i].name + " addr " + exports.symbols[i].addr.toString(16));
                }
                return exports.symbols[i].name;
            }
        }
        (0, logger_1.logColor)("can not find mapping " + symbol, logger_1.LogColor.RED);
        return "";
    },
    initSymbol: function () {
        let soinfo = this.getSoinfo(dumpconfig_1.soName);
        let sym = soinfo.get_sym();
        for (let i = 0; i < symCount; i++) {
            let st_name = sym.add(i * 24).readU32();
            let st_value = sym.add(i * 24 + 8).readU64();
            let string = soinfo.get_string(st_name);
            if (!string.isNull()) {
                let s = string.readCString();
                if (s.includes("il2cpp") || s.includes("HTP")) {
                    exports.symbols.push({ name: s, addr: st_value, mapping: "" });
                }
            }
        }
        exports.symbols.sort((a, b) => {
            return a.addr - b.addr;
        });
        let freeIndex = 0;
        let il2cpp_type_is_pointer_typeIndex = 0;
        let il2cpp_class_get_bitmap_sizeIndex = 0;
        let il2cpp_type_get_assembly_qualified_nameIndex = 0;
        let il2cpp_field_has_attributeIndex = 0;
        let il2cpp_unity_liveness_free_structIndex = 0;
        let il2cpp_gc_collectIndex = 0;
        let il2cpp_unity_liveness_calculation_from_staticsIndex = 0; //Unity 2020
        for (let i = 0; i < exports.symbols.length; i++) {
            if (enbale_log) {
                (0, logger_1.log)(exports.symbols[i].name + " " + exports.symbols[i].addr.toString(16));
            }
            //定位free
            if (exports.symbols[i].name === "il2cpp_free") {
                freeIndex = i;
            }
            if (exports.symbols[i].name === "il2cpp_type_is_pointer_type") {
                il2cpp_type_is_pointer_typeIndex = i;
            }
            if (exports.symbols[i].name === "il2cpp_class_get_bitmap_size") {
                il2cpp_class_get_bitmap_sizeIndex = i;
            }
            if (exports.symbols[i].name === "il2cpp_type_get_assembly_qualified_name") {
                il2cpp_type_get_assembly_qualified_nameIndex = i;
            }
            if (exports.symbols[i].name === "il2cpp_field_has_attribute") {
                il2cpp_field_has_attributeIndex = i;
            }
            if (exports.symbols[i].name === "il2cpp_unity_liveness_free_struct") {
                il2cpp_unity_liveness_free_structIndex = i;
            }
            if (exports.symbols[i].name === "il2cpp_gc_collect") {
                il2cpp_gc_collectIndex = i;
            }
            if (exports.symbols[i].name === "il2cpp_unity_liveness_calculation_from_statics") {
                il2cpp_unity_liveness_calculation_from_staticsIndex = i;
            }
        }
        if (freeIndex !== 0) {
            let symbol = exports.symbols[freeIndex + 1];
            if (symbol.name.length === "il2cpp_array_class_get".length) {
                exports.symbols[freeIndex + 1].mapping = "il2cpp_array_class_get";
            }
            symbol = exports.symbols[freeIndex + 2];
            //il2cpp_array_length
            if (symbol.name.length === "il2cpp_array_length".length) {
                exports.symbols[freeIndex + 2].mapping = "il2cpp_array_length";
            }
            symbol = exports.symbols[freeIndex + 3];
            //il2cpp_array_get_byte_length
            if (symbol.name.length === "il2cpp_array_get_byte_length".length) {
                exports.symbols[freeIndex + 3].mapping = "il2cpp_array_get_byte_length";
            }
            //il2cpp_array_new
            symbol = exports.symbols[freeIndex + 4];
            if (symbol.name.length === "il2cpp_array_new".length) {
                exports.symbols[freeIndex + 4].mapping = "il2cpp_array_new";
            }
            //il2cpp_array_new_specific
            symbol = exports.symbols[freeIndex + 5];
            if (symbol.name.length === "il2cpp_array_new_specific".length) {
                exports.symbols[freeIndex + 5].mapping = "il2cpp_array_new_specific";
            }
            //il2cpp_array_new_full
            symbol = exports.symbols[freeIndex + 6];
            if (symbol.name.length === "il2cpp_array_new_full".length) {
                exports.symbols[freeIndex + 6].mapping = "il2cpp_array_new_full";
            }
            //il2cpp_bounded_array_class_get
            symbol = exports.symbols[freeIndex + 7];
            if (symbol.name.length === "il2cpp_bounded_array_class_get".length) {
                exports.symbols[freeIndex + 7].mapping = "il2cpp_bounded_array_class_get";
            }
            //il2cpp_array_element_size
            symbol = exports.symbols[freeIndex + 8];
            if (symbol.name.length === "il2cpp_array_element_size".length) {
                exports.symbols[freeIndex + 8].mapping = "il2cpp_array_element_size";
            }
            //il2cpp_assembly_get_image
            symbol = exports.symbols[freeIndex + 9];
            if (symbol.name.length === "il2cpp_assembly_get_image".length) {
                exports.symbols[freeIndex + 9].mapping = "il2cpp_assembly_get_image";
            }
            //il2cpp_class_enum_basetype
            symbol = exports.symbols[freeIndex + 10];
            if (symbol.name.length === "il2cpp_class_enum_basetype".length) {
                exports.symbols[freeIndex + 10].mapping = "il2cpp_class_enum_basetype";
            }
            //il2cpp_class_from_system_type
            symbol = exports.symbols[freeIndex + 11];
            if (symbol.name.length === "il2cpp_class_from_system".length) {
                exports.symbols[freeIndex + 11].mapping = "il2cpp_class_from_system";
            }
            //il2cpp_class_is_generic
            symbol = exports.symbols[freeIndex + 12];
            if (symbol.name.length === "il2cpp_class_is_generic".length) {
                exports.symbols[freeIndex + 12].mapping = "il2cpp_class_is_generic";
            }
            //il2cpp_class_is_inflated
            symbol = exports.symbols[freeIndex + 13];
            if (symbol.name.length === "il2cpp_class_is_inflated".length) {
                exports.symbols[freeIndex + 13].mapping = "il2cpp_class_is_inflated";
            }
        }
        if (il2cpp_type_is_pointer_typeIndex !== 0) {
            let symbol = exports.symbols[il2cpp_type_is_pointer_typeIndex + 1];
            //il2cpp_image_get_assembly
            if (symbol.name.length === "il2cpp_image_get_assembly".length) {
                exports.symbols[il2cpp_type_is_pointer_typeIndex + 1].mapping = "il2cpp_image_get_assembly";
            }
            symbol = exports.symbols[il2cpp_type_is_pointer_typeIndex + 2];
            //il2cpp_image_get_name
            if (symbol.name.length === "il2cpp_image_get_name".length) {
                exports.symbols[il2cpp_type_is_pointer_typeIndex + 2].mapping = "il2cpp_image_get_name";
            }
            //il2cpp_image_get_filename
            symbol = exports.symbols[il2cpp_type_is_pointer_typeIndex + 3];
            if (symbol.name.length === "il2cpp_image_get_filename".length) {
                exports.symbols[il2cpp_type_is_pointer_typeIndex + 3].mapping = "il2cpp_image_get_filename";
            }
            //il2cpp_image_get_entry_point
            symbol = exports.symbols[il2cpp_type_is_pointer_typeIndex + 4];
            if (symbol.name.length === "il2cpp_image_get_entry_point".length) {
                exports.symbols[il2cpp_type_is_pointer_typeIndex + 4].mapping = "il2cpp_image_get_entry_point";
            }
            //il2cpp_image_get_class_count
            symbol = exports.symbols[il2cpp_type_is_pointer_typeIndex + 5];
            if (symbol.name.length === "il2cpp_image_get_class_count".length) {
                exports.symbols[il2cpp_type_is_pointer_typeIndex + 5].mapping = "il2cpp_image_get_class_count";
            }
            //il2cpp_image_get_class
            symbol = exports.symbols[il2cpp_type_is_pointer_typeIndex + 6];
            if (symbol.name.length === "il2cpp_image_get_class".length) {
                exports.symbols[il2cpp_type_is_pointer_typeIndex + 6].mapping = "il2cpp_image_get_class";
            }
        }
        if (il2cpp_class_get_bitmap_sizeIndex !== 0) {
            //il2cpp_class_get_static_field_data
            let deepIndex = -1;
            let symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 1];
            if (symbol.name.length === "il2cpp_class_get_static_field_data".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 1].mapping = "il2cpp_class_get_static_field_data";
            }
            //il2cpp_class_get_data_size -2
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 2];
            if (symbol.name.length === "il2cpp_class_get_data_size".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 2].mapping = "il2cpp_class_get_data_size";
            }
            //il2cpp_class_get_rank -3
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 3];
            if (symbol.name.length === "il2cpp_class_get_rank".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 3].mapping = "il2cpp_class_get_rank";
            }
            //il2cpp_class_get_assemblyname -4
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 4];
            if (symbol.name.length === "il2cpp_class_get_assemblyname".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 4].mapping = "il2cpp_class_get_assemblyname";
            }
            //il2cpp_class_get_image -5
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 5];
            if (symbol.name.length === "il2cpp_class_get_image".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 5].mapping = "il2cpp_class_get_image";
            }
            //il2cpp_class_is_enum -6
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 6];
            if (symbol.name.length === "il2cpp_class_is_enum".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 6].mapping = "il2cpp_class_is_enum";
            }
            //il2cpp_class_has_references
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 7];
            if (symbol.name.length === "il2cpp_class_has_references".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 7].mapping = "il2cpp_class_has_references";
            }
            //il2cpp_class_has_attribute
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 8];
            if (symbol.name.length === "il2cpp_class_has_attribute".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 8].mapping = "il2cpp_class_has_attribute";
            }
            //il2cpp_class_get_type_token
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 9];
            if (symbol.name.length === "il2cpp_class_get_type_token".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 9].mapping = "il2cpp_class_get_type_token";
            }
            //il2cpp_class_get_type
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 10];
            if (symbol.name.length === "il2cpp_class_get_type".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 10].mapping = "il2cpp_class_get_type";
            }
            //il2cpp_class_from_type
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 11];
            if (symbol.name.length === "il2cpp_class_from_type".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 11].mapping = "il2cpp_class_from_type";
            }
            //il2cpp_class_array_element_size
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 12];
            if (symbol.name.length === "il2cpp_class_array_element_size".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 12].mapping = "il2cpp_class_array_element_size";
            }
            //il2cpp_class_is_interface
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 13];
            if (symbol.name.length === "il2cpp_class_is_interface".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 13].mapping = "il2cpp_class_is_interface";
            }
            //il2cpp_class_is_abstract
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 14];
            if (symbol.name.length === "il2cpp_class_is_abstract".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 14].mapping = "il2cpp_class_is_abstract";
            }
            //il2cpp_class_get_flags
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 15];
            if (symbol.name.length === "il2cpp_class_get_flags".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 15].mapping = "il2cpp_class_get_flags";
            }
            //il2cpp_class_value_size
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 16];
            if (symbol.name.length === "il2cpp_class_value_size".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 16].mapping = "il2cpp_class_value_size";
            }
            //il2cpp_class_is_blittable
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 17];
            if (symbol.name.length === "il2cpp_class_is_blittable".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 17].mapping = "il2cpp_class_is_blittable";
            }
            //il2cpp_class_is_valuetype
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 18];
            if (symbol.name.length === "il2cpp_class_is_valuetype".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 18].mapping = "il2cpp_class_is_valuetype";
            }
            //il2cpp_class_num_fields
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 19];
            if (symbol.name.length === "il2cpp_class_num_fields".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 19].mapping = "il2cpp_class_num_fields";
            }
            //il2cpp_class_instance_size
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 20];
            if (symbol.name.length === "il2cpp_class_instance_size".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 20].mapping = "il2cpp_class_instance_size";
            }
            //il2cpp_class_get_declaring_type
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 21];
            if (symbol.name.length === "il2cpp_class_get_declaring_type".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 21].mapping = "il2cpp_class_get_declaring_type";
            }
            //il2cpp_class_get_parent
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 22];
            if (symbol.name.length === "il2cpp_class_get_parent".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 22].mapping = "il2cpp_class_get_parent";
            }
            //il2cpp_class_get_namespace
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 23];
            if (symbol.name.length === "il2cpp_class_get_namespace".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 23].mapping = "il2cpp_class_get_namespace";
            }
            //il2cpp_class_get_name
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 24];
            if (symbol.name.length === "il2cpp_class_get_name".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 24].mapping = "il2cpp_class_get_name";
            }
            //il2cpp_class_get_method_from_name
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 25];
            if (symbol.name.length === "il2cpp_class_get_method_from_name".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 25].mapping = "il2cpp_class_get_method_from_name";
            }
            //il2cpp_class_get_methods
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 26];
            if (symbol.name.length === "il2cpp_class_get_methods".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 26].mapping = "il2cpp_class_get_methods";
            }
            //il2cpp_class_get_field_from_name
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 27];
            if (symbol.name.length === "il2cpp_class_get_field_from_name".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 27].mapping = "il2cpp_class_get_field_from_name";
            }
            //il2cpp_class_get_property_from_name
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 28];
            if (symbol.name.length === "il2cpp_class_get_property_from_name".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 28].mapping = "il2cpp_class_get_property_from_name";
            }
            //il2cpp_class_get_properties
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 29];
            if (symbol.name.length === "il2cpp_class_get_properties".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 29].mapping = "il2cpp_class_get_properties";
            }
            //il2cpp_class_get_interfaces
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 30];
            if (symbol.name.length === "il2cpp_class_get_interfaces".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 30].mapping = "il2cpp_class_get_interfaces";
            }
            //il2cpp_class_get_nested_types
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 31];
            if (symbol.name.length === "il2cpp_class_get_nested_types".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 31].mapping = "il2cpp_class_get_nested_types";
            }
            //il2cpp_class_get_fields
            symbol = exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 32];
            if (symbol.name.length === "il2cpp_class_get_fields".length) {
                exports.symbols[il2cpp_class_get_bitmap_sizeIndex - 32].mapping = "il2cpp_class_get_fields";
            }
        }
        if (il2cpp_type_get_assembly_qualified_nameIndex !== 0) {
            //il2cpp_type_is_byref +1
            let symbol = exports.symbols[il2cpp_type_get_assembly_qualified_nameIndex + 1];
            if (symbol.name.length === "il2cpp_type_is_byref".length) {
                exports.symbols[il2cpp_type_get_assembly_qualified_nameIndex + 1].mapping = "il2cpp_type_is_byref";
            }
            //il2cpp_type_get_name -1
            symbol = exports.symbols[il2cpp_type_get_assembly_qualified_nameIndex - 1];
            if (symbol.name.length === "il2cpp_type_get_name".length) {
                exports.symbols[il2cpp_type_get_assembly_qualified_nameIndex - 1].mapping = "il2cpp_type_get_name";
            }
            //il2cpp_type_get_class_or_element_class -2
            symbol = exports.symbols[il2cpp_type_get_assembly_qualified_nameIndex - 2];
            if (symbol.name.length === "il2cpp_type_get_class_or_element_class".length) {
                exports.symbols[il2cpp_type_get_assembly_qualified_nameIndex - 2].mapping = "il2cpp_type_get_class_or_element_class";
            }
            //il2cpp_type_get_type -3
            symbol = exports.symbols[il2cpp_type_get_assembly_qualified_nameIndex - 3];
            if (symbol.name.length === "il2cpp_type_get_type".length) {
                exports.symbols[il2cpp_type_get_assembly_qualified_nameIndex - 3].mapping = "il2cpp_type_get_type";
            }
        }
        if (il2cpp_field_has_attributeIndex !== 0) {
            //il2cpp_field_get_value_object -1
            let symbol = exports.symbols[il2cpp_field_has_attributeIndex - 1];
            if (symbol.name.length === "il2cpp_field_get_value_object".length) {
                exports.symbols[il2cpp_field_has_attributeIndex - 1].mapping = "il2cpp_field_get_value_object";
            }
            //il2cpp_field_get_value -2
            symbol = exports.symbols[il2cpp_field_has_attributeIndex - 2];
            if (symbol.name.length === "il2cpp_field_get_value".length) {
                exports.symbols[il2cpp_field_has_attributeIndex - 2].mapping = "il2cpp_field_get_value";
            }
            //il2cpp_field_get_type -3
            symbol = exports.symbols[il2cpp_field_has_attributeIndex - 3];
            if (symbol.name.length === "il2cpp_field_get_type".length) {
                exports.symbols[il2cpp_field_has_attributeIndex - 3].mapping = "il2cpp_field_get_type";
            }
            //il2cpp_field_get_offset -4
            symbol = exports.symbols[il2cpp_field_has_attributeIndex - 4];
            if (symbol.name.length === "il2cpp_field_get_offset".length) {
                exports.symbols[il2cpp_field_has_attributeIndex - 4].mapping = "il2cpp_field_get_offset";
            }
            //il2cpp_field_get_parent -5
            symbol = exports.symbols[il2cpp_field_has_attributeIndex - 5];
            if (symbol.name.length === "il2cpp_field_get_parent".length) {
                exports.symbols[il2cpp_field_has_attributeIndex - 5].mapping = "il2cpp_field_get_parent";
            }
            //il2cpp_field_get_flags -6
            symbol = exports.symbols[il2cpp_field_has_attributeIndex - 6];
            if (symbol.name.length === "il2cpp_field_get_flags".length) {
                exports.symbols[il2cpp_field_has_attributeIndex - 6].mapping = "il2cpp_field_get_flags";
            }
            //il2cpp_field_get_name -7
            symbol = exports.symbols[il2cpp_field_has_attributeIndex - 7];
            if (symbol.name.length === "il2cpp_field_get_name".length) {
                exports.symbols[il2cpp_field_has_attributeIndex - 7].mapping = "il2cpp_field_get_name";
            }
        }
        if (il2cpp_gc_collectIndex !== 0) {
            //il2cpp_field_is_literal -1
            let symbol = exports.symbols[il2cpp_gc_collectIndex - 1];
            if (symbol.name.length === "il2cpp_field_is_literal".length) {
                exports.symbols[il2cpp_gc_collectIndex - 1].mapping = "il2cpp_field_is_literal";
            }
            //il2cpp_field_static_set_value -2
            symbol = exports.symbols[il2cpp_gc_collectIndex - 2];
            if (symbol.name.length === "il2cpp_field_static_set_value".length) {
                exports.symbols[il2cpp_gc_collectIndex - 2].mapping = "il2cpp_field_static_set_value";
            }
            //il2cpp_field_static_get_value
            symbol = exports.symbols[il2cpp_gc_collectIndex - 3];
            if (symbol.name.length === "il2cpp_field_static_get_value".length) {
                exports.symbols[il2cpp_gc_collectIndex - 3].mapping = "il2cpp_field_static_get_value";
            }
        }
        //method symbol find
        let methodFindInex = 0;
        if (il2cpp_unity_liveness_free_structIndex === 0) {
            methodFindInex = il2cpp_unity_liveness_calculation_from_staticsIndex;
        }
        else {
            methodFindInex = il2cpp_unity_liveness_free_structIndex;
        }
        if (methodFindInex !== 0) {
            //il2cpp_method_get_return_type +1
            let symbol = exports.symbols[methodFindInex + 1];
            if (symbol.name.length === "il2cpp_method_get_return_type".length) {
                exports.symbols[methodFindInex + 1].mapping = "il2cpp_method_get_return_type";
            }
            //il2cpp_method_get_from_reflection
            symbol = exports.symbols[methodFindInex + 2];
            if (symbol.name.length === "il2cpp_method_get_from_reflection".length) {
                exports.symbols[methodFindInex + 2].mapping = "il2cpp_method_get_from_reflection";
            }
            //il2cpp_method_get_object
            symbol = exports.symbols[methodFindInex + 3];
            if (symbol.name.length === "il2cpp_method_get_object".length) {
                exports.symbols[methodFindInex + 3].mapping = "il2cpp_method_get_object";
            }
            //il2cpp_method_get_name
            symbol = exports.symbols[methodFindInex + 4];
            if (symbol.name.length === "il2cpp_method_get_name".length) {
                exports.symbols[methodFindInex + 4].mapping = "il2cpp_method_get_name";
            }
            //il2cpp_method_is_generic
            symbol = exports.symbols[methodFindInex + 5];
            if (symbol.name.length === "il2cpp_method_is_generic".length) {
                exports.symbols[methodFindInex + 5].mapping = "il2cpp_method_is_generic";
            }
            //il2cpp_method_is_inflated
            symbol = exports.symbols[methodFindInex + 6];
            if (symbol.name.length === "il2cpp_method_is_inflated".length) {
                exports.symbols[methodFindInex + 6].mapping = "il2cpp_method_is_inflated";
            }
            //il2cpp_method_is_instance
            symbol = exports.symbols[methodFindInex + 7];
            if (symbol.name.length === "il2cpp_method_is_instance".length) {
                exports.symbols[methodFindInex + 7].mapping = "il2cpp_method_is_instance";
            }
            //il2cpp_method_get_param_count
            symbol = exports.symbols[methodFindInex + 8];
            if (symbol.name.length === "il2cpp_method_get_param_count".length) {
                exports.symbols[methodFindInex + 8].mapping = "il2cpp_method_get_param_count";
            }
            //il2cpp_method_get_param
            symbol = exports.symbols[methodFindInex + 9];
            if (symbol.name.length === "il2cpp_method_get_param".length) {
                exports.symbols[methodFindInex + 9].mapping = "il2cpp_method_get_param";
            }
            //il2cpp_method_get_class
            symbol = exports.symbols[methodFindInex + 10];
            if (symbol.name.length === "il2cpp_method_get_class".length) {
                exports.symbols[methodFindInex + 10].mapping = "il2cpp_method_get_class";
            }
            //il2cpp_method_has_attribute
            symbol = exports.symbols[methodFindInex + 11];
            if (symbol.name.length === "il2cpp_method_has_attribute".length) {
                exports.symbols[methodFindInex + 11].mapping = "il2cpp_method_has_attribute";
            }
            //il2cpp_method_get_declaring_type
            symbol = exports.symbols[methodFindInex + 12];
            if (symbol.name.length === "il2cpp_method_get_declaring_type".length) {
                exports.symbols[methodFindInex + 12].mapping = "il2cpp_method_get_declaring_type";
            }
            //il2cpp_method_get_flags
            symbol = exports.symbols[methodFindInex + 13];
            if (symbol.name.length === "il2cpp_method_get_flags".length) {
                exports.symbols[methodFindInex + 13].mapping = "il2cpp_method_get_flags";
            }
            //il2cpp_method_get_token
            symbol = exports.symbols[methodFindInex + 14];
            if (symbol.name.length === "il2cpp_method_get_token".length) {
                exports.symbols[methodFindInex + 14].mapping = "il2cpp_method_get_token";
            }
            //il2cpp_method_get_param_name
            symbol = exports.symbols[methodFindInex + 15];
            if (symbol.name.length === "il2cpp_method_get_param_name".length) {
                exports.symbols[methodFindInex + 15].mapping = "il2cpp_method_get_param_name";
            }
        }
    },
    getSoinfo: function (soname) {
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
        let targetSoInfo;
        linker_solist.forEach((soinfo, index) => {
            const realpath = soinfo_get_realpath(soinfo);
            // log("realpath " + realpath.readCString());
            if (realpath.readCString().includes(dumpconfig_1.soName)) {
                targetSoInfo = soinfo;
            }
        });
        return new SoInfo_1.SoInfo(targetSoInfo);
    },
    getIl2CppHandle: function () {
        // linker64 arm64
        let targetSoInfo = this.getSoinfo(dumpconfig_1.soName);
        return targetSoInfo.getHandle();
    }
};
},{"../ElfDumper":1,"../dumpconfig":4,"../il2cpp/struct/NativeStruct":21,"../logger":29,"./SoInfo":28}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoInfo = void 0;
const NativeStruct_1 = require("../il2cpp/struct/NativeStruct");
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
let get_stringFun = undefined;
class SoInfo extends NativeStruct_1.NativeStruct {
    get_dynamic() {
        //0x20
        return this.add(0x20).readPointer();
    }
    get_string(index) {
        if (get_stringFun === undefined) {
            get_stringFun = new NativeFunction(resolveLinkerSymbol("linker64", "__dl__ZNK6soinfo10get_stringEj"), "pointer", ["pointer", "uint64"]);
        }
        return get_stringFun(this, index);
    }
    get_sym() {
        return this.add(0x40).readPointer();
    }
    getHandle() {
        const soinfo_to_handle = new NativeFunction(resolveLinkerSymbol("linker64", '__dl__ZN6soinfo9to_handleEv'), 'pointer', ['pointer']);
        return soinfo_to_handle(this);
    }
}
exports.SoInfo = SoInfo;
},{"../il2cpp/struct/NativeStruct":21}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogColor = exports.logColor = exports.logHHexLength = exports.logHHex = exports.log4Android = exports.log4AndroidE = exports.log4AndroidW = exports.log4AndroidI = exports.log4AndroidV = exports.log4AndroidD = exports.log = void 0;
const DEBUG = false;
const INTOOLS = false;
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
},{}],30:[function(require,module,exports){
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
},{}],31:[function(require,module,exports){
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

},{}],32:[function(require,module,exports){
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

},{"process/browser.js":31,"timers":32}]},{},[25])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZ2VudC9FbGZEdW1wZXIuanMiLCJhZ2VudC9hbmQvWmlwVXRpbHMuanMiLCJhZ2VudC9jb25maWcuanMiLCJhZ2VudC9kdW1wY29uZmlnLmpzIiwiYWdlbnQvZHVtcGVyLmpzIiwiYWdlbnQvaG9va2xpbmtlci5qcyIsImFnZW50L2lsMmNwcC9DU0ZpbGVPdXQuanMiLCJhZ2VudC9pbDJjcHAvRmlsZVV0aWxzLmpzIiwiYWdlbnQvaWwyY3BwL0lsMkNwcFR5cGVFbnVtLmpzIiwiYWdlbnQvaWwyY3BwL2hhY2tlci9zdHJ1Y3QvSWwyY3BwU3RyaW5nLmpzIiwiYWdlbnQvaWwyY3BwL2lsMmNwcEFwaS5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvSWwyQ3BwQ2xhc3MuanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L0lsMkNwcEZpZWxkSW5mby5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvSWwyQ3BwR2VuZXJpY0NvbnRleHQuanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L0lsMkNwcEdlbmVyaWNJbnN0LmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9JbDJDcHBHZW5lcmljTWV0aG9kLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9JbDJDcHBJbWFnZS5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvSWwyQ3BwUHJvcGVydHlJbmZvLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9JbDJDcHBUeXBlLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9NZXRob2RJbmZvLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9OYXRpdmVTdHJ1Y3QuanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L3N0cnVjdEl0ZW0uanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L3V0aWxzLmpzIiwiYWdlbnQvaWwyY3BwL3RhYmxlZGVmcy5qcyIsImFnZW50L2luZGV4LnRzIiwiYWdlbnQvaW9zL0lPU1V0aWxzLmpzIiwiYWdlbnQvbGlua2VyL0xpbmtlckhlbHBlci5qcyIsImFnZW50L2xpbmtlci9Tb0luZm8uanMiLCJhZ2VudC9sb2dnZXIudHMiLCJhZ2VudC9zYWZlU2VsZi5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvdGltZXJzLWJyb3dzZXJpZnkvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OztBQ0FBLHFDQUFxRDtBQUlyRCxNQUFNLFFBQVEsR0FDVixJQUFJLGNBQWMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUV4RyxJQUFJLE9BQU8sQ0FBQztBQUNaLElBQUksT0FBTyxDQUFDO0FBQ1osSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDO0FBRW5CLElBQUksWUFBWSxHQUFHLEVBQUUsQ0FBQztBQUN0QixJQUFJLGNBQWMsR0FBRyxDQUFDLENBQUM7QUFDdkIsSUFBSSxTQUFTLEdBQUcsRUFBRSxDQUFDO0FBQ25CLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQztBQUNwQixJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUM7QUFFekIsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLENBQUM7QUFDekIsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDO0FBQ2hCLFNBQVMsV0FBVyxDQUFDLE1BQU07SUFDdkIsT0FBTyxNQUFNLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQztBQUNELE1BQWMsVUFBVyxTQUFRLGFBQWE7SUFDMUMsWUFBWSxPQUFPO1FBQ2YsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ25CLENBQUM7SUFDRCxPQUFPO1FBQ0gsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2xDLENBQUM7SUFDRCxVQUFVO1FBRU4sT0FB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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiJ9
