var expect = chai.expect;

suite('TypeScript relative import', function(){
    var resultSimpleImport;
    var resultNodeImport;
    
    setup(function (done) {
        initTest('ts-relative-import')
            .then(function (_projectPath) {
                var projectPath  = _projectPath;
                var testFilePath;
                
                testFilePath = normalizePath(projectPath + "./web/main.ts");
                
                resultSimpleImport = lTools.getAutoCompletion({
                    context: 1,
                    path: testFilePath,
                    content: TEST_FILES[testFilePath].content,
                    line: 2,
                    character: 5,
                    project: projectPath
                });
                
                testFilePath = normalizePath(projectPath + "./web/test.ts");
                
                resultNodeImport = lTools.getAutoCompletion({
                    context: 1,
                    path: testFilePath,
                    content: TEST_FILES[testFilePath].content,
                    line: 1,
                    character: 7,
                    project: projectPath
                });

                done();
            });
    });
    
    test('the result should have a completion property', function () {
        expect(resultSimpleImport).to.have.property("completion");
        expect(resultNodeImport).to.have.property("completion");
    });
    test('the completion property should be an array', function () {
        expect(resultSimpleImport.completion).to.be.an("array");
        expect(resultNodeImport.completion).to.be.an("array");
    });    
    test("simple : an object created from an imported class has completion", function(){
        expect(resultSimpleImport.completion).to.deep.include.members([
            {
                _kind: "property",
                displayText: "title",
                text: "title"
            }
        ]);
    });
    test("NodeJS : when importing a module with a d.ts file, we obtain completion", function(){
        expect(resultNodeImport.completion).to.deep.include.members([
            {
                _kind: "class",
                displayText: "SuperClass",
                text: "SuperClass"
            }
        ]);
    });
});
