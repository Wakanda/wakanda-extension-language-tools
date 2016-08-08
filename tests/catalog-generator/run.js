var expect = chai.expect;

suite('Catalog Generator', function(){
    test('has a generateModel method', function(){
        expect(CatalogGenerator).to.have.property("generateModel");
        expect(CatalogGenerator.generateModel).to.be.a("function");
    });
    test('has a generateDS method', function(){
        expect(CatalogGenerator).to.have.property("generateDS");
        expect(CatalogGenerator.generateDS).to.be.a("function");
    });
    test('has a getAttributeType method', function(){
        expect(CatalogGenerator).to.have.property("getAttributeType");
        expect(CatalogGenerator.getAttributeType).to.be.a("function");
    });
    
    /**
     * getAttributeType()
     */
    suite('getAttributeType()', function(){
        test("Maps type blob to interface Blob", function(){
            var result = CatalogGenerator.getAttributeType({
                kind : "storage",
                type : "blob"
            });
            
            expect(result).to.equal("Blob");
        });
        test("Maps type image to interface Image", function(){
            var result = CatalogGenerator.getAttributeType({
                kind : "storage",
                type : "image"
            });
            
            expect(result).to.equal("Image");
        });
        test("Maps type long to interface number", function(){
            var result = CatalogGenerator.getAttributeType({
                kind : "storage",
                type : "long"
            });
            
            expect(result).to.equal("number");
        });
        test("Maps type date to interface Date", function(){
            var result = CatalogGenerator.getAttributeType({
                kind : "storage",
                type : "date"
            });
            
            expect(result).to.equal("Date");
        });
        test("Maps relatedEntity type to corresponding private interface", function(){
            var result = CatalogGenerator.getAttributeType({
                kind : "relatedEntity",
                type : "MyType"
            });
            
            expect(result).to.equal("__DSMyTypeEntity");
        });
        test("Maps relatedEntities type to corresponding private interface", function(){
            var result = CatalogGenerator.getAttributeType({
                kind : "relatedEntities",
                type : "MyTypeCollection"
            });
            
            expect(result).to.equal("__DSMyTypeEntityCollection");
        });
        test("Maps other types to an interface with the same name", function(){
            var result = CatalogGenerator.getAttributeType({
                kind : "storage",
                type : "!:AnUnknownType:!"
            });
            
            expect(result).to.equal("!:AnUnknownType:!");
        });
    });
});
