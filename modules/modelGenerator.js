exports.generateModel = function(dataclasses){
	var modelTemplate     = "interface _Model extends Model {\n{{dataclasses}}\n}\ndeclare var model : _Model;\n\n";
	var attributeTemplate = "interface Model{{dataclass}}{{attribute}}Attribute extends ModelDataClassAttribute {};\n\n";
	var dataclassTemplate = "interface Model{{dataclass}} extends ModelDataClass {\n{{attributes}}\n}\n\n";
	var modelDefinition   = "";

	(function generateModelContent(dataclasses){
		var output = "";

		dataclasses.forEach(function(dataclass){
			output += "\t" + dataclass.className + " : Model" + dataclass.className + ";\n";
		});

		modelDefinition += modelTemplate.replace("{{dataclasses}}", output);

	})(dataclasses);


	dataclasses.forEach(function(dataclass){

		var dataclassContent = "";
		var dataclassAttribtuesList = "";

		(function generateDataclassContent(dataclass){
			dataclass.attributes.forEach(function(attribute){
				dataclassContent += "\t" + attribute.name + " : Model" + dataclass.className + attribute.name + "Attribute;\n"; //example : "ID : FileIDAttribute;"
				dataclassAttribtuesList += attributeTemplate.replace("{{dataclass}}", dataclass.className).replace("{{attribute}}", attribute.name) + "\n"; //example : "interface FileIDAttribute extends DatastoreClassAttribute {};"
			});
		})(dataclass);


		modelDefinition += dataclassAttribtuesList;
		modelDefinition += dataclassTemplate.replace("{{dataclass}}", dataclass.className).replace("{{attributes}}", dataclassContent);


	});

	return modelDefinition;

};

exports.generateDS = function(dataclasses){

	var dsTemplate        = "\
interface GeneratedDataStore extends Datastore {\n\
	{{dataclasses}}\n\
}\n\
declare var ds : GeneratedDataStore;\n\n";

	var dataclassTemplate = "\
interface __DS{{dataclass}} extends DatastoreClass {\n\
	createEntity() : __DS{{dataclass}}Entity;\n\
	new() : __DS{{dataclass}}Entity;\n\
	find(queryString: String, ...valueList: any[]) : __DS{{dataclass}}Entity;\n\
	first() : __DS{{dataclass}}Entity;\n\
	all() : __DS{{dataclass}}EntityCollection;\n\
	query(queryString: String, ...valueList: any[]) : __DS{{dataclass}}EntityCollection;\n\
	fromArray(arrayValues: any[]) : __DS{{dataclass}}EntityCollection;\n\
	orderBy(attributeList: String, sortOrder?: String) : __DS{{dataclass}}EntityCollection;\n\
	orderBy(attributeList: __DatastoreClassAttribute, sortOrder?: String) : __DS{{dataclass}}EntityCollection;\n\
	createEntityCollection(keepSorted?: String) : __DS{{dataclass}}EntityCollection;\n\
	createEntityCollection(keepSorted?: Boolean) : __DS{{dataclass}}EntityCollection;\n\
	forEach(callbackFn: (entity : __DS{{dataclass}}Entity)=>void) : void;\n\
}\n\n";

	var entityTemplate    = "\
interface __DS{{dataclass}}Entity extends Entity{\n\
	\t{{attributes}}\n\
}\n\n";

	var entityCollectionTemplate    = "\
interface __DS{{dataclass}}EntityCollection extends EntityCollection{\n\
	and(collection2: __DS{{dataclass}}EntityCollection) : __DS{{dataclass}}EntityCollection;\n\
	minus(collection2: __DS{{dataclass}}EntityCollection) : __DS{{dataclass}}EntityCollection;\n\
	or(collection2: __DS{{dataclass}}EntityCollection) : __DS{{dataclass}}EntityCollection;\n\
	orderBy(attributeList: String, sortOrder?: String) : __DS{{dataclass}}EntityCollection;\n\
	orderBy(attributeList: DatastoreClassAttribute, sortOrder?: String) : __DS{{dataclass}}EntityCollection;\n\
	query(queryString: String, ...valueList: any[]) : __DS{{dataclass}}EntityCollection;\n\
	find(queryString: String, ...valueList: any[]) : __DS{{dataclass}}Entity;\n\
	first() : __DS{{dataclass}}Entity;\n\
	forEach(callbackFn: (entity : __DS{{dataclass}}Entity)=>void) : void;\n\
	[index : number] : __DS{{dataclass}}Entity;\n\
}\n\n";

	var dsDataClassesTemplate = "\t{{dataclass}} : __DS{{dataclass}};\n";

	var dsContent         = "";
	var entities          = "";
	var entityCollections = "";
	var dsDataclasses     = "";

	dataclasses.forEach(function(dataclass){

		dsDataclasses += dataclassTemplate.replace(/\{\{dataclass\}\}/g, dataclass.className);
		var entityAttributes = (function generateEntityContent(dataclass){
			var entityContent = "";
			dataclass.attributes.forEach(function(attribute){

				var attributeType = getAttributeType(attribute);

				entityContent += "\t" + attribute.name + " : " + attributeType + ";\n"; //example : "ID : UUID;"
			});
			return entityContent;
		})(dataclass);

		entities += replacePatterns(entityTemplate, [
			{
				"variable" : "dataclass",
				"value" : dataclass.className
			},
			{
				"variable" : "attributes",
				"value" : entityAttributes
			}
		]);

		entityCollections +=  replacePatterns(entityCollectionTemplate, [
			{
				"variable" : "dataclass",
				"value" : dataclass.className
			}
		]);

		dsContent += replacePatterns(dsDataClassesTemplate, [
			{
				"variable" : "dataclass",
				"value" : dataclass.className
			}
		]);
	});

	var dsDefinition = replacePatterns(dsTemplate, [
			{
				"variable" : "dataclasses",
				"value" : dsContent
			}
	]);

	var output = dsDataclasses + entities + entityCollections + dsDefinition;

	return output;
};

function replacePatterns(template, list)
{
	var output = template;

	list.forEach(function(element){
		output = replacePattern(output, element.variable, element.value);
	});

	return output;
};

function replacePattern(template, variable, value)
{
	return template.replace(new RegExp("\\{\\{"+variable+"\\}\\}", "g"), value);
}

function getAttributeType(attribute)
{
	var attributeType;

	switch(attribute.kind)
	{
		case "relatedEntity":
			attributeType = "DS" + attribute.type + "Entity";
			break;
		case "relatedEntities":
			attributeType = "DS" + attribute.type.replace("Collection", "") + "EntityCollection";
			break;
		default:
			switch(attribute.type)
			{
				case "date":
					attributeType = "Date";
					break
				case "long":
					attributeType = "number";
					break;
				case "blob":
					attributeType = "Blob";
					break;
				case "image":
					attributeType = "Image";
					break;
				default:
					attributeType = attribute.type;
			}
	}

	return attributeType;
}
