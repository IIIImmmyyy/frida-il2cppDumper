(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TailedPay = void 0;
const logger_1 = require("../logger");
const config_1 = require("../config");
const Tailedfilter_1 = require("./Tailedfilter");
const il2cppApi_1 = require("../il2cpp/il2cppApi");
const utils_1 = require("../il2cpp/struct/utils");
const Il2cppString_1 = require("../il2cpp/hacker/struct/Il2cppString");
let once = false;
function inject() {
}
exports.TailedPay = {
    start: function () {
        let module = Process.findModuleByName(config_1.soName);
        (0, logger_1.log)("module:" + module);
        if (module === null) {
            setTimeout(function () {
                exports.TailedPay.start();
            }, 1000);
            return;
        }
        if (once) {
            return;
        }
        once = true;
        //循环等待注入时机
        while (true) {
            let size_t = Memory.alloc(Process.pointerSize);
            let domain = il2cppApi_1.il2cppApi.il2cpp_domain_get();
            let assemblies = il2cppApi_1.il2cppApi.il2cpp_domain_get_assemblies(domain, size_t);
            let assemblies_count = size_t.readInt();
            if (assemblies_count > 0) {
                break;
            }
        }
        inject();
    },
    waitInject: function () {
        (0, logger_1.log)("waitInject");
        let module = Process.findModuleByName(config_1.soName);
        if (module != null) {
            if (!config_1.DEBUG) {
                exports.TailedPay.start();
            }
            else {
                exports.TailedPay.hookMethod();
            }
            return;
        }
        let open = Module.findExportByName(null, "open");
        //fopen替换
        (0, logger_1.log)("等待Il2cpp:" + open);
        if (open != null) {
            Interceptor.attach(open, {
                onEnter: function (args) {
                    let path = args[0].readCString();
                    // log("path:" + path);
                    if (path.indexOf(config_1.soName) !== -1) {
                        this.hook = true;
                    }
                },
                onLeave: function (retval) {
                    if (this.hook) {
                        // log("il2cpp 加载完成")
                        // Interceptor.detachAll();
                        if (!config_1.DEBUG) {
                            exports.TailedPay.start();
                        }
                        else {
                            exports.TailedPay.hookMethod();
                        }
                    }
                }
            });
        }
    },
    hookMethod: function () {
        let module = Process.findModuleByName(config_1.soName);
        // log("module:" + module);
        if (module === null) {
            setTimeout(function () {
                exports.TailedPay.hookMethod();
            }, 1000);
            return;
        }
        if (once) {
            return;
        }
        once = true;
        //获取il2cpp
        Tailedfilter_1.Tailedfilter.start();
        setTimeout(function () {
            inject();
            (0, logger_1.log)("延迟注入");
            let size_t = Memory.alloc(Process.pointerSize);
            let domain = il2cppApi_1.il2cppApi.il2cpp_domain_get();
            let assemblies = il2cppApi_1.il2cppApi.il2cpp_domain_get_assemblies(domain, size_t);
            let assemblies_count = size_t.readInt();
            (0, logger_1.log)("assemblies_count:" + assemblies_count + " pointerSize:" + Process.pointerSize
                + " assemblies:" + assemblies);
            let il2CppImageArray = new Array();
            for (let i = 0; i < assemblies_count; i++) {
                let assembly = assemblies.add(Process.pointerSize * i).readPointer();
                let Il2CppImage = il2cppApi_1.il2cppApi.il2cpp_assembly_get_image(assembly);
                let typeStart = Il2CppImage.typeStart();
                il2CppImageArray.push(Il2CppImage);
            }
            for (let i = 0; i < il2CppImageArray.length; i++) {
                let Il2CppImage = il2CppImageArray[i];
                let nameNoExt = Il2CppImage.nameNoExt();
                (0, logger_1.log)("name:" + nameNoExt);
                if (nameNoExt.indexOf("Assembly-CSharp") !== -1) {
                    findAllClass(Il2CppImage);
                }
            }
        }, 2000);
    }
};
function findAllClass(il2cppImage) {
    let class_count = il2cppImage.typeCount();
    for (let i = 0; i < class_count; i++) {
        let il2CppClass = il2cppImage.getClass(i);
        let name = il2CppClass.name();
        let namespaze = il2CppClass.namespaze();
        let newVar = Tailedfilter_1.Tailedfilter.filterClassMap.get(name);
        if (newVar !== undefined && newVar) {
            return;
        }
        findMethod(il2CppClass);
        // if (name==="LoginView") {
        // }
        // if (name.indexOf("IapTestUI")!==-1
        // || name.indexOf("IAPManager")!==-1
        // || name.indexOf("PopupBiweeklyEventShopItemCell")!==-1){
        //     findMethod(il2CppClass);
        // }
    }
}
let methodContentMap = new Map();
function findMethod(il2CppClass) {
    let iter = Memory.alloc(Process.pointerSize);
    let methodInfo;
    let baseAddr = Module.findBaseAddress(config_1.soName);
    while (!(methodInfo = il2CppClass.getMethods(iter)).isNull()) {
        let methodPointer = methodInfo.getMethodPointer();
        let number = methodPointer - baseAddr;
        let methodName = methodInfo.name();
        let namespaze = il2CppClass.namespaze();
        let klass_name = il2CppClass.name();
        if (!methodPointer.isNull()) {
            let filterMethod = Tailedfilter_1.Tailedfilter.filterMethodMap.get(methodName);
            if (filterMethod !== undefined && filterMethod) {
                continue;
            }
            let methodContent = "";
            let methodModifier = utils_1.utils.get_method_modifier(methodInfo.getFlags());
            methodContent = methodContent + methodModifier;
            //返回类型
            let returnType = methodInfo.getReturnType();
            let return_cls = il2cppApi_1.il2cppApi.il2cpp_class_from_type(returnType);
            let name1 = return_cls.name();
            if (name1.indexOf("`") !== -1) {
                let split = name1.split("`");
                name1 = split[0];
                name1 = name1 + return_cls.getGenericName();
            }
            methodContent = methodContent + name1 + " " + methodInfo.name() + "(";
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
                    methodContent = methodContent + name + " " + methodInfo.getParamName(i);
                    if (i + 1 !== paramCount) {
                        methodContent = methodContent + ", ";
                    }
                    else {
                        methodContent = methodContent + ") { }\n";
                    }
                }
            }
            else {
                methodContent = methodContent + "){ }\n";
            }
            let addr = number.toString(16).toUpperCase();
            methodContentMap.set(addr, methodContent);
            // log("注入函数:"+methodPointer+" \n "+methodContent + " class:"+il2CppClass.name()+ "offer:"+addr);
            try {
                Interceptor.attach(methodPointer, {
                    onEnter: function (args) {
                        (0, logger_1.logColor)("-----------------------------------------------------------------------------------------------", logger_1.LogColor.C35);
                        (0, logger_1.logColor)(" method  call ", logger_1.LogColor.C44);
                        (0, logger_1.log)(" nameSpaze:" + namespaze + " class:" + klass_name);
                        (0, logger_1.log)(" methodPointer offset in IDA:" + addr);
                        //参数类型也打印出来
                        let newVar = methodContentMap.get(addr);
                        (0, logger_1.log)(" " + newVar);
                        if (methodName === "LoadSpecData") {
                            (0, logger_1.log)("args[1]:" + new Il2cppString_1.Il2cppString(args[0]).getCString());
                            this.hook = true;
                        }
                        if (methodName === "GetPrice") {
                            (0, logger_1.log)("pid：" + new Il2cppString_1.Il2cppString(args[1]).getCString());
                            // var trace = Thread.backtrace(this.context, Backtracer.ACCURATE).map(DebugSymbol.fromAddress).join("\n");
                            // logColor(trace, LogColor.RED);
                        }
                        if (methodName === "BuyProduct") {
                            (0, logger_1.log)("productId：" + new Il2cppString_1.Il2cppString(args[1]).getCString());
                        }
                        (0, logger_1.logColor)(" method  end ", logger_1.LogColor.C44);
                        (0, logger_1.logColor)("-----------------------------------------------------------------------------------------------", logger_1.LogColor.C35);
                    }
                });
            }
            catch (e) {
                (0, logger_1.log)("注入异常:" + methodPointer + " \n " + methodContent + " class:" + il2CppClass.name() + "  fun_addr:" + addr);
                (0, logger_1.log)("error:" + e.toString());
            }
        }
    }
}
},{"../config":3,"../il2cpp/hacker/struct/Il2cppString":5,"../il2cpp/il2cppApi":6,"../il2cpp/struct/utils":18,"../logger":21,"./Tailedfilter":2}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tailedfilter = void 0;
exports.Tailedfilter = {
    filterMethodMap: new Map(),
    filterClassMap: new Map(),
    start: function () {
        this.filterMethodMap.set("UpdateLoadingBar", true);
        this.filterMethodMap.set("get_CurrentUri", true);
        this.filterMethodMap.set("MoveNext", true);
        this.filterMethodMap.set("get_Current", true);
        this.filterMethodMap.set("GetSkillSpecData", true);
        this.filterMethodMap.set("IsEventActive", true);
        // this.filterMethodMap.set("OfferForActivationIsAdded",true);
        // this.filterMethodMap.set("GetEventActivation",true);
        this.filterMethodMap.set("TryGetMutation", true);
        this.filterMethodMap.set("CheckMutation", true);
        this.filterMethodMap.set("GetTimer", true);
        this.filterMethodMap.set("GetTimer", true);
        this.filterMethodMap.set("Create", true);
        this.filterMethodMap.set("Check", true);
        this.filterMethodMap.set("GetTimeStamp", true);
        this.filterMethodMap.set("SecondTick", true);
        this.filterMethodMap.set("Tick", true);
        this.filterMethodMap.set("UpdateTimer", true);
        this.filterMethodMap.set("SetTimer", true);
        this.filterMethodMap.set("get_Progress", true);
        // this.filterMethodMap.set("IsCompleteState",true);
        this.filterMethodMap.set("TryActivateOfferLimits", true);
        this.filterMethodMap.set("UpdateSafePosition", true);
        this.filterMethodMap.set("SetSafeToInitialPosition", true);
        this.filterMethodMap.set("NeedProcess", true);
        this.filterMethodMap.set("SetTutorialTextOffset", true);
        this.filterMethodMap.set("EnergyRestoreControllerOnOnSecondsTick", true);
        this.filterMethodMap.set("get_MergeRecoursesView", true);
        this.filterMethodMap.set("IsMaxEnergyBuffEndedOnPause", true);
        this.filterMethodMap.set("SafeMoved", true);
        this.filterMethodMap.set("GetPurchases", true);
        this.filterMethodMap.set("get_MainWindowView", true);
        this.filterMethodMap.set("SetMoneyTextOffsets", true);
        this.filterMethodMap.set("SetTooltipBackgroundOffset", true);
        this.filterMethodMap.set("SetSafeWindowRectOffset", true);
        this.filterMethodMap.set("ShowTitleActiveButton", true);
        this.filterMethodMap.set("SetScrollOffsets", true);
        this.filterMethodMap.set("UpdateTimers", true);
        this.filterMethodMap.set("get_SeasonPassPremiumWindowView", true);
        this.filterMethodMap.set("get_PlayerModel", true);
        this.filterMethodMap.set("TryGetLastGroupEventEndTimestamp", true);
        this.filterMethodMap.set("GetEventsInfo", true);
        this.filterMethodMap.set("GetBuildingData", true);
        this.filterMethodMap.set("GetPlayerLevel", true);
        this.filterMethodMap.set("IsOfferGroupActive", true);
        // this.filterMethodMap.set("TryGetEventEndTimeStamp",true);
        // this.filterMethodMap.set("TryGetEventStatus",true);
        this.filterMethodMap.set("IsQuestCompleted", true);
        this.filterMethodMap.set("IsEventEnded", true);
        this.filterMethodMap.set("CheckConditions", true);
        this.filterMethodMap.set("CheckChainConditions", true);
        this.filterMethodMap.set("IsEventEnded", true);
        this.filterMethodMap.set("get_IsTimerEnabled", true);
        this.filterMethodMap.set("FixedTick", true);
        this.filterMethodMap.set("LateTick", true);
        // this.filterMethodMap.set("TryAddNewEvent",true);
        // this.filterMethodMap.set("TryAddNotActiveEvent",true);
        this.filterMethodMap.set("IsInInterval", true);
        this.filterMethodMap.set("SetEnergyTimer", true);
        this.filterMethodMap.set("GetRemainingSeconds", true);
        this.filterMethodMap.set("TickBankRemainingTime", true);
        this.filterMethodMap.set("CheckPaymentGroupConditions", true);
        this.filterMethodMap.set("SetEnergyTimer", true);
        this.filterMethodMap.set("HasProgress", true);
        this.filterMethodMap.set("SetEnergyTimer", true);
        this.filterMethodMap.set("get_MatchHudView", true);
        this.filterMethodMap.set("SetupTimer", true);
        this.filterMethodMap.set("<IsEventActive>b__21_0", true);
        this.filterMethodMap.set("UpdateOfferTimer", true);
        this.filterMethodMap.set("GetLastBuildingTick", true);
        this.filterMethodMap.set("Update", true);
        this.filterMethodMap.set("ToTimer", true);
        this.filterMethodMap.set("HashCode", true);
        this.filterMethodMap.set("FromUnixTime", true);
        this.filterMethodMap.set("GetDailyChallengeEndTimestamp", true);
        this.filterMethodMap.set("EventsTimeout", true);
        this.filterMethodMap.set("TryRemoveInvalidOffers", true);
        this.filterMethodMap.set("EventsTimeout", true);
        this.filterMethodMap.set("CheckNotActiveEvents", true);
        this.filterMethodMap.set("EventsTimeout", true);
        this.filterMethodMap.set("CheckEventsEnd", true);
        this.filterMethodMap.set("UpdateOffers", true);
        this.filterMethodMap.set("GetHashCode", true);
        this.filterMethodMap.set("HasLimit", true);
        this.filterMethodMap.set("Compare", true);
        this.filterMethodMap.set("getEvensInfo", true);
        this.filterMethodMap.set("ToUnixTime", true);
        this.filterMethodMap.set("get_IsInitialized", true);
        this.filterMethodMap.set("FillMap", true);
        this.filterMethodMap.set("SetLockPinState", true);
        this.filterMethodMap.set("TimerControllerOnOnEverySecond", true);
        this.filterMethodMap.set("GetEventActivation", true);
        this.filterMethodMap.set("IsActive", true);
        this.filterMethodMap.set("TryAddNotActiveEvent", true);
        this.filterMethodMap.set("TryAddNewEvent", true);
        this.filterMethodMap.set("TryGetEventEndTimeStamp", true);
        this.filterMethodMap.set("IsCompleteState", true);
        this.filterMethodMap.set("OfferForActivationIsAdded", true);
        //class-------------------------------------------
        this.filterClassMap.set("FrenchInnLoadingController", true);
        this.filterClassMap.set("FrenchInnProgressBarController", true);
        this.filterClassMap.set("QuestCompleted", true);
        this.filterClassMap.set("TimeProvider", true);
        this.filterClassMap.set("SeasonPassMainWindowScrollView", true);
        this.filterClassMap.set("EnergyRestoreController", true);
        this.filterClassMap.set("UIWindow", true);
        this.filterClassMap.set("DragCameraController", true);
        this.filterClassMap.set("EventEndedCondition", true);
        this.filterClassMap.set("AverageReceiptCondition", true);
        this.filterClassMap.set("MapHudViewController", true);
        // this.filterClassMap.set("EventsObserver",true);
        this.filterClassMap.set("TutorialCompleted", true);
        this.filterClassMap.set("TutorialStep", true);
        this.filterClassMap.set("UnityUtil", true);
        this.filterClassMap.set('ZoomCameraController', true);
        this.filterClassMap.set("FileSystemUtils", true);
        this.filterClassMap.set("TaskExtensions", true);
        this.filterClassMap.set("TimeProvider", true);
        this.filterClassMap.set("MutationPopulateController", true);
        this.filterClassMap.set("ComparisonExtensions", true);
        this.filterClassMap.set("BuffProvider", true);
        this.filterClassMap.set("BuffsPlayerDataController", true);
        this.filterClassMap.set("GooglePlayLoginController", true);
        this.filterClassMap.set("ScriptableEventsFactory", true);
        this.filterClassMap.set("MapHudState", true);
        this.filterClassMap.set("MapHudView", true);
        this.filterClassMap.set("BackgroundAudioController", true);
        this.filterClassMap.set("Point", true);
        this.filterClassMap.set("TutorialController", true);
        this.filterClassMap.set("HasEnergyToUse", true);
        this.filterClassMap.set("TutorialCompletedTrigger", true);
        this.filterClassMap.set("ItemSpawnedTrigger", true);
        this.filterClassMap.set("TutorialController", true);
        this.filterClassMap.set("PlayerLevel", true);
        this.filterClassMap.set("UIGradient", true);
        this.filterClassMap.set("CurrentHouseEventStage", true);
    },
    getMethodMap: function () {
        return this.filterMethodMap;
    }
};
},{}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPEN_DUMP_SCRIPT = exports.API_NOT_EXIT = exports.DUMP_SO_PATH = exports.IDA_SCRIPT_PATH = exports.JSON_PATH = exports.stringLiteralPath = exports.MEMORY_DUMP_SO_PATH = exports.DUMP_FILE_PATH = exports.DEBUG = exports.path = exports.GetTypeInfoFromTypeIndex_Addr = exports.GetMethodInfoFromIndex_Addr = exports.FromTypeDefinition_Addr = exports.UNITY_VER = exports.pkg_name = exports.soName = exports.UnityVer = void 0;
exports.UnityVer = {
    V_2017_4_31f1: "2017.4.31f1",
    V_2018_4_36f1: "2018.4.36f1",
    V_2020: "2020",
};
exports.soName = "libil2cpp.so";
exports.pkg_name = "com.cookapps.taileddemonslayer";
exports.UNITY_VER = exports.UnityVer.V_2018_4_36f1;
exports.FromTypeDefinition_Addr = 0xbacdb40; //通过IDA 计算得到 只有Unity2017.3.版本需要手动计算2018版本不需要
exports.GetMethodInfoFromIndex_Addr = 0x2261ac;
exports.GetTypeInfoFromTypeIndex_Addr = 0x226120;
exports.path = "/data/data/" + exports.pkg_name;
exports.DEBUG = true;
exports.DUMP_FILE_PATH = exports.path + "/dump.cs";
exports.MEMORY_DUMP_SO_PATH = exports.path + "/memory_so.so";
exports.stringLiteralPath = exports.path + "/stringLiteral.json";
exports.JSON_PATH = exports.path;
exports.IDA_SCRIPT_PATH = exports.path + "/script.json";
exports.DUMP_SO_PATH = "/system/lib64/libdumper.so";
exports.API_NOT_EXIT = -1001;
exports.OPEN_DUMP_SCRIPT = true;
},{}],4:[function(require,module,exports){
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
},{}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Il2cppString = void 0;
const NativeStruct_1 = require("../../struct/NativeStruct");
const il2cppApi_1 = require("../../il2cppApi");
const config_1 = require("../../../config");
class Il2cppString extends NativeStruct_1.NativeStruct {
    getCString() {
        if (this.isNull()) {
            return "指针空";
        }
        let length = Il2cppString.getLength(this);
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
                let decodeUnicode1 = Il2cppString.decodeUnicode(unicode);
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
    static getLength(s) {
        return il2cppApi_1.il2cppApi.il2cpp_string_length(s);
    }
    static getMoMoString(s) {
        // _Z16parserMoMoStringP10MonoString
        // if (Il2cppString.momoParserModule === undefined) {
        //
        //         Il2cppString.momoParserModule = Module.load("libnative-lib.so");
        //
        // }
        // let nativePointer = Il2cppString.momoParserModule.findExportByName("_Z16parserMoMoStringP10MonoString");
        // let nativeFunction = new NativeFunction(nativePointer, "pointer", ['pointer']);
        // return nativeFunction(s).readCString();
        if (s.isNull()) {
            return "指针空";
        }
        let length = il2cppApi_1.il2cppApi.il2cpp_string_length(s);
        //长度4字节本身偏移16 从20位开始
        let il2cppStringChars = il2cppApi_1.il2cppApi.il2cpp_string_chars(s);
        let content = "";
        for (let i = 0; i < length; i++) {
            let offset = i * 2;
            let s = il2cppStringChars.add(offset).readU16().toString(16);
            // console.log("il2cppStringChars:" + s);
            //转unicode
            if (s.toString().length === 2) {
                let s2 = il2cppStringChars.add(offset).readCString();
                content = content + s2;
            }
            else {
                //转换unicode
                let unicode = "\\u" + s.toString();
                let decodeUnicode1 = Il2cppString.decodeUnicode(unicode);
                content = content + decodeUnicode1;
                // log("s2:"+this.decodeUnicode(unicode));
            }
            // let s1 = String.fromCharCode(unicode);
        }
        if (length > 1000000) {
            let file = new File(config_1.JSON_PATH + "/json_" + length + ".json", "wb");
            file.write(content);
            file.flush();
            file.close();
        }
        if (content === undefined) {
            return "";
        }
        return content;
    }
    static decodeUnicode(str) {
        let replace = str.replace(/\\/g, "%");
        return unescape(replace);
    }
}
exports.Il2cppString = Il2cppString;
Il2cppString.momoParserModule = undefined;
},{"../../../config":3,"../../il2cppApi":6,"../../struct/NativeStruct":16}],6:[function(require,module,exports){
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
    il2cpp_method_is_generic: function (method) {
        let il2cpp_method_is_generic = this.load("il2cpp_method_is_generic", "bool", ['pointer']);
        return il2cpp_method_is_generic(method);
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
},{"../config":3,"./struct/Il2CppClass":7,"./struct/Il2CppFieldInfo":8,"./struct/Il2CppImage":12,"./struct/Il2CppPropertyInfo":13,"./struct/Il2CppType":14,"./struct/MethodInfo":15}],7:[function(require,module,exports){
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
},{"../il2cppApi":6,"./NativeStruct":16}],8:[function(require,module,exports){
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
},{"../il2cppApi":6,"./Il2CppClass":7,"./NativeStruct":16,"./utils":18}],9:[function(require,module,exports){
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
},{"./Il2CppGenericInst":10,"./NativeStruct":16}],10:[function(require,module,exports){
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
},{"./NativeStruct":16}],11:[function(require,module,exports){
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
},{"./Il2CppGenericContext":9,"./NativeStruct":16}],12:[function(require,module,exports){
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
        // return  this.getOffsetTypeCount();
    }
    getOffsetTypeCount() {
        if (config_1.UNITY_VER === config_1.UnityVer.V_2020) {
            return this.add(24).readPointer().toInt32();
        }
        else {
            return this.get("typeCount").readPointer().toInt32();
        }
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
},{"../../config":3,"../il2cppApi":6,"./Il2CppClass":7,"./NativeStruct":16,"./structItem":17}],13:[function(require,module,exports){
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
},{"../il2cppApi":6,"./NativeStruct":16}],14:[function(require,module,exports){
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
},{"../../logger":21,"../il2cppApi":6,"./NativeStruct":16}],15:[function(require,module,exports){
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
},{"../../config":3,"../../logger":21,"../il2cppApi":6,"./Il2CppClass":7,"./Il2CppGenericMethod":11,"./NativeStruct":16}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeStruct = void 0;
class NativeStruct extends NativePointer {
    constructor(pointer) {
        super(pointer);
    }
}
exports.NativeStruct = NativeStruct;
},{}],17:[function(require,module,exports){
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
},{}],18:[function(require,module,exports){
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
        // if (flags & tabledefs.METHOD_ATTRIBUTE_STATIC) {
        //     content = content + "static ";
        // }
        // if (flags & tabledefs.METHOD_ATTRIBUTE_ABSTRACT) {
        //     content = content+ "abstract ";
        //     if ((flags & tabledefs.METHOD_ATTRIBUTE_VTABLE_LAYOUT_MASK) === tabledefs.METHOD_ATTRIBUTE_REUSE_SLOT) {
        //         content = content+ "override ";
        //     }
        // } else if (flags & tabledefs.METHOD_ATTRIBUTE_FINAL) {
        //     if ((flags & tabledefs.METHOD_ATTRIBUTE_VTABLE_LAYOUT_MASK) === tabledefs.METHOD_ATTRIBUTE_REUSE_SLOT) {
        //         content = content+  "sealed override ";
        //     }
        // } else if (flags & tabledefs.METHOD_ATTRIBUTE_VIRTUAL) {
        //     if ((flags & tabledefs.METHOD_ATTRIBUTE_VTABLE_LAYOUT_MASK) === tabledefs.METHOD_ATTRIBUTE_NEW_SLOT) {
        //         content = content+ "virtual ";
        //     } else {
        //         content = content+  "override ";
        //     }
        // }
        // if (flags & tabledefs.METHOD_ATTRIBUTE_PINVOKE_IMPL) {
        //     content = content+ "extern ";
        // }
        return content;
    }
};
},{"../Il2CppTypeEnum":4,"../tabledefs":19}],19:[function(require,module,exports){
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
};
},{}],20:[function(require,module,exports){
(function (setImmediate){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TailedPay_1 = require("./Tailed/TailedPay");
setImmediate(main);
function main() {
    // jniTrace.start();
    // pass.start();
    // pass.start();
    //il2cpp 注入
    // qinpu.start();
    // @ts-ignore
    // tpPass.waitInject();
    // moniqipass.waitInject();
    // TailedPay.waitInject();
    // pay.waitInject();
    // TailedPay.waitInject();
    TailedPay_1.TailedPay.waitInject();
    // videoHook.start();
    // moniqipass.waitInject();
    // dumper.start();
    // pay.waitInject();
    //     DataHook.start();
    // Process.setExceptionHandler(function (detail) {
    //     let address = detail.address;
    //     let module1 = Process.findModuleByAddress(address);
    //
    //     logColor("setExceptionHandler address : "+address +"module:"+module1?.path,LogColor.RED);
    //     return true;
    // });
    // dumper.start();
    // dumper.waitInject();
    //导入参数堆栈hook
    // log("空运行");
    // log("dump end");
    // //open 函数
    // logColor("main start",LogColor.YELLOW);
    // Il2cppHacker.getGameObject();
    // Il2cppHacker.createObject();
    // Il2cppHacker.dumpSo();
    // Il2cppHacker.dumpIDAScript()
}
}).call(this)}).call(this,require("timers").setImmediate)

},{"./Tailed/TailedPay":1,"timers":23}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogColor = exports.logColor = exports.logHHex = exports.log4Android = exports.log = void 0;
const DEBUG = false;
function log(msg) {
    if (DEBUG) {
        log4Android(msg);
    }
    else {
        console.log(msg);
    }
}
exports.log = log;
function log4Android(msg) {
    let log = "android.util.Log";
    let log_cls = Java.use(log);
    log_cls.i("Dumper", msg);
}
exports.log4Android = log4Android;
function logHHex(pointer) {
    console.log(hexdump(pointer, {
        offset: 0,
        length: 64,
        header: true,
        ansi: true
    }));
}
exports.logHHex = logHHex;
function logColor(message, type) {
    if (DEBUG) {
        log4Android(message);
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
},{}],22:[function(require,module,exports){
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

},{}],23:[function(require,module,exports){
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

},{"process/browser.js":22,"timers":23}]},{},[20])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZ2VudC9UYWlsZWQvVGFpbGVkUGF5LmpzIiwiYWdlbnQvVGFpbGVkL1RhaWxlZGZpbHRlci5qcyIsImFnZW50L2NvbmZpZy50cyIsImFnZW50L2lsMmNwcC9JbDJDcHBUeXBlRW51bS5qcyIsImFnZW50L2lsMmNwcC9oYWNrZXIvc3RydWN0L0lsMmNwcFN0cmluZy5qcyIsImFnZW50L2lsMmNwcC9pbDJjcHBBcGkuanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L0lsMkNwcENsYXNzLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9JbDJDcHBGaWVsZEluZm8uanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L0lsMkNwcEdlbmVyaWNDb250ZXh0LmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9JbDJDcHBHZW5lcmljSW5zdC5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvSWwyQ3BwR2VuZXJpY01ldGhvZC5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvSWwyQ3BwSW1hZ2UuanMiLCJhZ2VudC9pbDJjcHAvc3RydWN0L0lsMkNwcFByb3BlcnR5SW5mby5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvSWwyQ3BwVHlwZS5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvTWV0aG9kSW5mby5qcyIsImFnZW50L2lsMmNwcC9zdHJ1Y3QvTmF0aXZlU3RydWN0LmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC9zdHJ1Y3RJdGVtLmpzIiwiYWdlbnQvaWwyY3BwL3N0cnVjdC91dGlscy5qcyIsImFnZW50L2lsMmNwcC90YWJsZWRlZnMuanMiLCJhZ2VudC9pbmRleC50cyIsImFnZW50L2xvZ2dlci50cyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvdGltZXJzLWJyb3dzZXJpZnkvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OztBQ0FBLHNDQUFrRDtB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SSxFQUFFLEdBQUc7Q0FDWixDQUFBOztBQ3BGRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiJ9
