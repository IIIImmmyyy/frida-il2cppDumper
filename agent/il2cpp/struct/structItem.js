

export function StructItem(param, size) { //声明对象{
    this.param = param;
    this.size = size;
}



export function getStructOffset(struct, name) {
    let all = 0;
    for (let i = 0; i < struct.length; i++) {
        let item = struct[i];
        let param = item.param;
        let size = item.size;
        if (param === name) {
            if (i === 0) {
                return 0;
            } else {
                return all;
            }
        } else {
            all = all + size;
        }

    }
}