var expect = chai.expect;

suite('js auto completion', function() {

    var responses = {};
    setup(function (done) {
        initTest('js-completion')
            .then(function (_projectPath) {
                var projectPath  = _projectPath,
                    files = {
                        file0: normalizePath(projectPath + './app/app.js'),
                        file1: normalizePath(projectPath + './app/app.1.js'),
                        file2: normalizePath(projectPath + './app/app.2.js'),
                        file3: normalizePath(projectPath + './app/app.3.js')
                    };
                
                responses.result0 = lTools.getAutoCompletion({
                    context: 1,
                    path: files.file0,
                    content: TEST_FILES[files.file0].content,
                    line: 9,
                    character: 3,
                    project: projectPath
                });

                responses.result1 = lTools.getAutoCompletion({
                    context: 1,
                    path: files.file1,
                    content: TEST_FILES[files.file1].content,
                    line: 9,
                    character: 4,
                    project: projectPath
                });

                responses.result2 = lTools.getAutoCompletion({
                    context: 1,
                    path: files.file2,
                    content: TEST_FILES[files.file2].content,
                    line: 9,
                    character: 3,
                    project: projectPath
                });

                responses.result3 = lTools.getAutoCompletion({
                    context: 1,
                    path: files.file3,
                    content: TEST_FILES[files.file3].content,
                    line: 5,
                    character: 5,
                    project: projectPath
                });

                done();
            });
    });
    
    test('get autocompletion for function name', function () {
        expect(responses.result0.completion).to.deep.include.members([
            {
                _kind: 'function',
                displayText: 'test',
                text: 'test'
            }
        ]);
    });

    test('get autocompletion for function name when adding 1 character in the end of the file', function () {
        expect(responses.result1.completion).to.deep.include.members([
            {
                _kind: 'function',
                displayText: 'test',
                text: 'test'
            }
        ]);
    });

    test('get autocompletion for function name when removing 2 character in the end of the file', function () {
        expect(responses.result2.completion).to.deep.include.members([
            {
                _kind: 'function',
                displayText: 'test',
                text: 'test'
            }
        ]);
    });

    test('get autocompletion for function name in the body of the file', function () {
        expect(responses.result3.completion).to.deep.include.members([
            {
                _kind: 'function',
                displayText: 'test',
                text: 'test'
            }
        ]);
    });
});
