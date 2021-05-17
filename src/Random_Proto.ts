interface Source {
    name: string;
}

Object.defineProperty(Source.prototype, "name", {
    get() {
        return this.id;
    }
})
