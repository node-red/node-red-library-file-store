const should = require("should");
const os = require("os");
const path = require("path");
const fs = require("fs-extra");

const pluginModule = require("../index.js");

describe("node-red-library-file-store", function() {
    let pluginClass;
    let tmpDir;
    let Store;

    after(function(done) {
        if (tmpDir) {
            fs.remove(tmpDir).then(() => {
                tmpDir = null;
                done()
            })
        } else {
            done();
        }
    })
    it("registers itself", function(done) {
        pluginModule({
            plugins: {
                registerPlugin: (id, plugin) => {
                    try {
                        id.should.eql("node-red-library-file-store")
                        plugin.should.have.property("type","node-red-library-source");
                        plugin.should.have.property("class");
                        (typeof plugin.class).should.eql("function");
                        pluginClass = plugin.class;
                        done();
                    } catch(err) {
                        done(err)
                    }
                }
            }
        })
    })

    it("creates its root dir when initialised", async function() {
        tmpDir = path.join(os.tmpdir(),Math.floor((Math.random()*100000)).toString(16));
        fs.existsSync(tmpDir).should.be.false();
        Store = new pluginClass({
            id: 123,
            label: "test-store",
            path: tmpDir
        })
        fs.existsSync(tmpDir).should.be.false();

        await Store.init();
        fs.existsSync(tmpDir).should.be.true();
    })

    it("saves a flow entry", async function() {

        const flow = '{"a":1}';

        await Store.saveEntry("flows","/test/flow/flow.json",null,flow)

        const expectedFile = path.join(tmpDir,"/flows/test/flow/flow.json");
        fs.existsSync(expectedFile).should.be.true();
        const result = await Store.getEntry("flows","/test/flow/flow.json");
        JSON.parse(result).should.eql(JSON.parse(flow));
    })
    it("saves a flow entry with .json extension", async function() {

        const flow = '{"a":1}';

        await Store.saveEntry("flows","/test/flow/flow2",null,flow)

        const expectedFile = path.join(tmpDir,"/flows/test/flow/flow2.json");
        fs.existsSync(expectedFile).should.be.true();
        const result = await Store.getEntry("flows","/test/flow/flow.json");
        JSON.parse(result).should.eql(JSON.parse(flow));
    })

    it("lists directory contents", async function() {
        let result = await Store.getEntry("flows","/");
        result.should.eql(['test'])
        result = await Store.getEntry("flows","/test");
        result.should.eql(['flow'])
        result = await Store.getEntry("flows","/test/flow");
        result.should.eql([ { fn: 'flow.json' }, { fn: 'flow2.json' } ])
    })

    it("throws error for non-existent file path", async function() {
        try {
            await Store.getEntry("flows","does not exist")
        } catch(err) {
            return
        }
        throw new Error("No error thrown");
    })

    it("returns empty array for non-existent directory path", async function() {
        let result = await Store.getEntry("flows","does not exist/");
        result.should.eql([])
    })

    it("saves a non-flow type with meta-data", async function() {

        const testData = 'This is my test data\nThat spans many\nlines';
        const metaData = {"foo":"bar","booleanT":true,"booleanF":false, "number":4,"multiLine":"one\ntwo\nthree"};


        await Store.saveEntry("testType","a-file",metaData,testData)

        const expectedFile = path.join(tmpDir,"/testType/a-file");
        fs.existsSync(expectedFile).should.be.true();

        const result = await Store.getEntry("testType","a-file");
        result.should.eql(testData);


        const dirList = await Store.getEntry("testType","/");
        dirList.should.eql([{
            foo: 'bar',
            booleanT: 'true',
            booleanF: 'false',
            number: '4',
            multiLine: 'one\ntwo\nthree',
            fn: 'a-file'
        }])

    })


})