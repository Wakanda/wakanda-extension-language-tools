var expect = chai.expect;

suite('Catalog Completion Generation', function () {
    var projectPath;
    var result;
    var testFilePath;
    
    setup(function (done) {
        initTest('model-generation')
            .then(function (_projectPath) {
                projectPath  = _projectPath;
                testFilePath = normalizePath(projectPath + "./database/model.js");
                
                result = lTools.getAutoCompletion({
                    context: 4,
                    path: testFilePath,
                    content: TEST_FILES[testFilePath].content,
                    line: 0,
                    character: 3,
                    project: projectPath
                });

                done();
            });
    });

    test('the result should have a completion property', function () {
        expect(result).to.have.property("completion");
    });
    test('the completion property should be an array', function () {
        expect(result.completion).to.be.an("array");
    });
    test('the completion array should include ds properties', function () {
        expect(result.completion).to.deep.include.members([
            {
                _kind: "property",
                displayText: "dataClasses",
                text: "dataClasses"
            },
            {
                _kind: "method",
                displayText: "getDataFolder",
                text: "getDataFolder"
            }
        ]);
    });

    suite("ds Generation", function () {
        var dataClasses;
        var generatedDS;
        var result;
        var completion;

        setup(function (done) {

            var strDataClasses = TEST_FILES[normalizePath(projectPath + "./database/dataClasses.json")].content;

            dataClasses = JSON.parse(strDataClasses);
            generatedDS = CatalogGenerator.generateDS(dataClasses);

            /**
             * Update the ds object definition
             */
            lTools.updateFile({
                context: 4,
                project: projectPath,
                path: projectPath + "/__!!MODEL!!__.d.ts",
                content: generatedDS
            });

            result = lTools.getAutoCompletion({
                context: 4,
                path: testFilePath,
                content: TEST_FILES[testFilePath].content,
                line: 0,
                character: 3,
                project: projectPath
            });

            completion = result.completion;

            done();
        });

        test("ds contains model's dataClasses", function () {
            expect(completion).to.deep.include.members([
                {
                    _kind: "property",
                    displayText: "Employee",
                    text: "Employee"
                },
                {
                    _kind: "property",
                    displayText: "Company",
                    text: "Company"
                }
            ]);
        });
        
        test("a generated dataClass contains DataClass interface methods", function () {
            var newVersionPath = normalizePath(projectPath + "./database/model.2.js");
            var context        = 4;
            var path           = testFilePath;
            var content        = TEST_FILES[newVersionPath].content;
            var line           = 0;
            var character      = 11;
            var project        = projectPath;
                   
            var result = lTools.getAutoCompletion({
                context: context,
                path: path,
                content: content,
                line: line,
                character: character,
                project: project
            });
            
            var completion = result.completion;
            
            expect(completion).to.deep.include.members([
                {
                    _kind: "method",
                    displayText: "createEntity",
                    text: "createEntity"
                },
                {
                    _kind: "method",
                    displayText: "find",
                    text: "find"
                },
                {
                    _kind: "method",
                    displayText: "first",
                    text: "first"
                }
            ]);
        });
        
        test("a generated entity has Entity interface methods and contains attributes of the corresponding dataClass", function () {
            var newVersionPath = normalizePath(projectPath + "./database/model.2.js");
            var context        = 4;
            var path           = testFilePath;
            var content        = TEST_FILES[newVersionPath].content;
            var line           = 0;
            var character      = 19;
            var project        = projectPath;
                   
            var result = lTools.getAutoCompletion({
                context: context,
                path: path,
                content: content,
                line: line,
                character: character,
                project: project
            });
            
            var completion = result.completion;
            
            expect(completion).to.deep.include.members([
                {
                    _kind: "property",
                    displayText: "ID",
                    text: "ID"
                },
                {
                    _kind: "property",
                    displayText: "name",
                    text: "name"
                },
                {
                    _kind: "property",
                    displayText: "logo",
                    text: "logo"
                },
                {
                    _kind: "property",
                    displayText: "employees",
                    text: "employees"
                },
                {
                    _kind: "method",
                    displayText: "remove",
                    text: "remove"
                }
            ]);
        });
        
        test("a generated entity has completion on a property of type relatedEntities", function () {
            var newVersionPath = normalizePath(projectPath + "./database/model.2.js");
            var context        = 4;
            var path           = testFilePath;
            var content        = TEST_FILES[newVersionPath].content;
            var line           = 0;
            var character      = 29;
            var project        = projectPath;
                   
            var result = lTools.getAutoCompletion({
                context: context,
                path: path,
                content: content,
                line: line,
                character: character,
                project: project
            });
            
            var completion = result.completion;

            expect(completion).to.deep.include.members([
                {
                    _kind: "method",
                    displayText: "first",
                    text: "first"
                }
            ]);
        });
        
        test("a generated entity has completion on a property of type relatedEntity", function () {
            var newVersionPath = normalizePath(projectPath + "./database/model.2.js");
            var context        = 4;
            var path           = testFilePath;
            var content        = TEST_FILES[newVersionPath].content;
            var line           = 0;
            var character      = 37;
            var project        = projectPath;
                   
            var result = lTools.getAutoCompletion({
                context: context,
                path: path,
                content: content,
                line: line,
                character: character,
                project: project
            });
            
            var completion = result.completion;

            expect(completion).to.deep.include.members([
                {
                    _kind: "property",
                    displayText: "ID",
                    text: "ID"
                },
                {
                    _kind: "property",
                    displayText: "fname",
                    text: "fname"
                },
                {
                    _kind: "property",
                    displayText: "lname",
                    text: "lname"
                },
                {
                    _kind: "property",
                    displayText: "photo",
                    text: "photo"
                },
                {
                    _kind: "property",
                    displayText: "contract",
                    text: "contract"
                },
                {
                    _kind: "property",
                    displayText: "dob",
                    text: "dob"
                },
                {
                    _kind: "property",
                    displayText: "company",
                    text: "company"
                }
            ]);
        });
    })
});


// test model completion
suite('model object generation', function () {
    var responses = {},
        projectPath,
        files = {};

    suiteSetup(function(done) {
        initTest('model-generation')
            .then(function (_projectPath) {
                projectPath = _projectPath;
                files = {
                    file0: normalizePath(projectPath + './database/model-object-completion.js'),
                    file1: normalizePath(projectPath + './database/model-object-completion.1.js'),
                    dataClasses: normalizePath(projectPath + './database/dataClasses.json')
                };

                // generate model
                var strDataClasses = TEST_FILES[files.dataClasses].content;
                var dataClasses = JSON.parse(strDataClasses);
                
                var generatedModel = CatalogGenerator.generateModel(dataClasses);

                lTools.updateFile({
                    context: 4,
                    project: projectPath,
                    path: 'model.waModel',
                    content: generatedModel
                });

                done();
            });
    });

    suite('model object completion', function() {
        suiteSetup(function(done) {
            responses.result0 = lTools.getAutoCompletion({
                context: 4,
                path: files.file0,
                content: TEST_FILES[files.file0].content,
                line: 0,
                character: 6,
                project: projectPath
            });
            responses.result1 = lTools.getAutoCompletion({
                context: 4,
                path: files.file1,
                content: TEST_FILES[files.file1].content,
                line: 0,
                character: 15,
                project: projectPath
            });
            done();
        });

        test('model contains model\'s dataClasses', function () {
            var completion = responses.result0.completion;
            expect(completion).to.deep.include.members([
                {
                    _kind: 'property',
                    displayText: 'Employee',
                    text: 'Employee'
                },
                {
                    _kind: 'property',
                    displayText: 'Company',
                    text: 'Company'
                }
            ]);
        });

        test('dataClass contains attributes', function() {
            var completion = responses.result1.completion;

            expect(completion).to.deep.include.members([
                {
                    _kind: 'property',
                    displayText: 'ID',
                    text: 'ID'
                },
                {
                    _kind: 'property',
                    displayText: 'fname',
                    text: 'fname'
                },
                {
                    _kind: 'property',
                    displayText: 'lname',
                    text: 'lname'
                },
                {
                    _kind: 'property',
                    displayText: 'photo',
                    text: 'photo'
                },
                {
                    _kind: 'property',
                    displayText: 'contract',
                    text: 'contract'
                },
                {
                    _kind: 'property',
                    displayText: 'dob',
                    text: 'dob'
                },
                {
                    _kind: 'property',
                    displayText: 'company',
                    text: 'company'
                }
            ]);
        });
    });
});