'use strict';

const Item = require('./item');

class Manager {

    constructor() {
        this.name2item = {};
        this.depend2item = {};
    }

    /**
     * 添加一个任务
     * @param {*} name 
     * @param {*} options 
     */
    add(name, options) {
        const item = this.name2item[name] = new Item(name, options);

        if (item.depends) {
            item.depends.forEach((name) => {
                const array = this.depend2item[name] = this.depend2item[name] || [];
                array.push(item);
            });
        }
    }

    /**
     * 移出一个任务
     * @param {*} name 
     */
    remove(name) {
        const item = this.name2item[name];
        delete this.name2item[name];

        if (item.depends) {
            item.depends.forEach((name) => {
                const array = this.depend2item[name];
                const index = array.indexOf(item);
                array.splice(index, 1);
                if (!array.length) {
                    delete this.depend2item[name];
                }
            });
        }
    }

    /**
     * 执行某个任务
     * @param {*} name 
     */
    async execute(name) {
        const item = this.name2item[name];
        if (!item) {
            console.warn(`Task execution failed: '${name}' does not exist.`);
            return null;
        }

        // 检查依赖是否都运行
        const refused = item.depends.some((name) => {
            const depend = this.name2item[name];
            return !depend.executed;
        });

        if (refused) {
            console.warn(`Task execution failed: '${name}' dependencies are not completed.`);
            return null;
        }

        if (!item.executed && !item.running) {
            item.running = true;
            const result = await item.handle();
            item.running = false;
            return result;
        }

        return null;
    }

    /**
     * 标记某个任务已经完成
     * @param {*} name 
     */
    finish(name) {
        const item = this.name2item[name];
        if (!item) {
            return;
        }
        item.executed = true;

        // 任务执行完毕之后，执行依赖这个任务的其他任务
        const depends = this.depend2item[name] || [];

        for (let i = 0; i < depends.length; i++) {
            const child = depends[i];

            // 检查依赖这个任务的某个任务是否达到了执行标准
            const allow = !child.depends.some((name) => {
                return !this.name2item[name] || !this.name2item[name].executed;
            });
            
            if (allow) {
                this.execute(child.name);
            }
        }
    }

    /**
     * 重置一个任务的标记
     * 会将依赖该任务的其他任务也一并重制
     * @param {*} name 
     */
    async reset(name) {
        const item = this.name2item[name];
        if (!item) {
            return;
        }
        await item.reset();
        item.executed = false;

        const depends = this.depend2item[name] || [];

        for (let i = 0; i < depends.length; i++) {
            const child = depends[i];
            this.reset(child.name);
        }
    }
}

module.exports = Manager;
