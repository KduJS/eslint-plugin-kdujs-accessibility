import type { Rule } from "eslint";
import type { AST } from "kdu-eslint-parser";

import {
  defineTemplateBodyVisitor,
  getElementAttributeValue,
  getElementType,
  isHiddenFromScreenReader,
  makeDocsURL,
  makeKebabCase
} from "../utils";

type Association = "nesting" | "id";
type Required =
  | Association
  | { some: Association[]; every: undefined }
  | { some: undefined; every: Association[] };

type Options = { allowChildren: boolean; controlComponents: string[] };

const controlTypes = ["input", "meter", "progress", "select", "textarea"];

function validateNesting(node: AST.KElement, options: Options): boolean {
  return node.children.some((child) => {
    const { allowChildren, controlComponents } = options;

    if (child.type === "KElement" && child.rawName === "slot") {
      return allowChildren;
    }

    if (child.type === "KElement") {
      return (
        !isHiddenFromScreenReader(child) &&
        (controlTypes
          .concat(controlComponents)
          .includes(getElementType(child)) ||
          validateNesting(child, options))
      );
    }

    return false;
  });
}

function validate(node: AST.KElement, rule: Association, options: Options) {
  switch (rule) {
    case "nesting":
      return validateNesting(node, options);
    case "id":
      return getElementAttributeValue(node, "for");
    default:
      return false;
  }
}

function isValidLabel(
  node: AST.KElement,
  required: Required,
  options: Options
) {
  if (typeof required === "string") {
    return validate(node, required, options);
  }

  if (Array.isArray(required.some)) {
    return required.some.some((rule) => validate(node, rule, options));
  }

  if (Array.isArray(required.every)) {
    return required.every.every((rule) => validate(node, rule, options));
  }
}

const rule: Rule.RuleModule = {
  meta: {
    docs: {
      url: makeDocsURL("label-has-for")
    },
    messages: {
      default: "Form label must have an associated control."
    },
    schema: [
      {
        type: "object",
        properties: {
          components: {
            type: "array",
            items: {
              type: "string"
            },
            uniqueItems: true
          },
          controlComponents: {
            type: "array",
            items: {
              type: "string"
            },
            uniqueItems: true
          },
          required: {
            oneOf: [
              {
                type: "string",
                enum: ["nesting", "id"]
              },
              {
                type: "object",
                properties: {
                  some: {
                    type: "array",
                    items: {
                      type: "string",
                      enum: ["nesting", "id"]
                    },
                    uniqueItems: true
                  }
                },
                required: ["some"]
              },
              {
                type: "object",
                properties: {
                  every: {
                    type: "array",
                    items: {
                      type: "string",
                      enum: ["nesting", "id"]
                    },
                    uniqueItems: true
                  }
                },
                required: ["every"]
              }
            ]
          },
          allowChildren: {
            type: "boolean"
          }
        }
      }
    ]
  },
  create(context) {
    return defineTemplateBodyVisitor(context, {
      KElement(node) {
        const {
          allowChildren = false,
          components = [],
          controlComponents = [],
          required = { every: ["nesting", "id"] }
        } = context.options[0] || {};

        const labelComponents = components.map(makeKebabCase).concat("label");
        const options = {
          allowChildren,
          controlComponents: controlComponents.map(makeKebabCase)
        };

        if (
          labelComponents.includes(getElementType(node)) &&
          !isValidLabel(node, required, options)
        ) {
          context.report({ node: node as any, messageId: "default" });
        }
      }
    });
  }
};

export default rule;
