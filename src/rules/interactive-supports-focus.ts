import type { Rule } from "eslint";
import type { AST } from "kdu-eslint-parser";
import { ARIARoleDefintionKey, dom, roles } from "aria-query";

import {
  defineTemplateBodyVisitor,
  getAttributeValue,
  getElementAttribute,
  getElementAttributeValue,
  getElementType,
  hasOnDirectives,
  isHiddenFromScreenReader,
  isInteractiveElement,
  isPresentationRole,
  makeDocsURL
} from "../utils";

const interactiveRoles: ARIARoleDefintionKey[] = [];

for (const [role, definition] of roles.entries()) {
  if (
    !definition.abstract &&
    definition.superClass.some((classes) => classes.includes("widget"))
  ) {
    interactiveRoles.push(role);
  }
}

const interactiveHandlers = [
  "click",
  "contextmenu",
  "dblclick",
  "doubleclick",
  "drag",
  "dragend",
  "dragenter",
  "dragexit",
  "dragleave",
  "dragover",
  "dragstart",
  "drop",
  "keydown",
  "keypress",
  "keyup",
  "mousedown",
  "mouseenter",
  "mouseleave",
  "mousemove",
  "mouseout",
  "mouseover",
  "mouseup"
];

function isDisabledElement(node: AST.KElement) {
  return (
    getElementAttributeValue(node, "disabled") ||
    (getElementAttributeValue(node, "aria-disabled") || "").toString() ===
      "true"
  );
}

function isInteractiveRole(value: any): value is string {
  if (typeof value !== "string") {
    return false;
  }

  return value
    .toLowerCase()
    .split(" ")
    .some(
      (role) => roles.has(role as any) && interactiveRoles.includes(role as any)
    );
}

function hasTabIndex(node: AST.KElement) {
  const attribute = getElementAttribute(node, "tabindex");

  if (!attribute) {
    return false;
  }

  const value = getAttributeValue(attribute);

  if (["string", "number"].includes(typeof value)) {
    if (typeof value === "string" && value.length === 0) {
      return false;
    }
    return Number.isInteger(Number(value));
  }

  if (value === true || value === false) {
    return false;
  }

  return value === null;
}

interface InteractiveSupportsFocus extends Rule.RuleModule {
  interactiveHandlers: string[];
  interactiveRoles: ARIARoleDefintionKey[];
}

const rule: InteractiveSupportsFocus = {
  meta: {
    docs: {
      url: makeDocsURL("interactive-supports-focus")
    },
    messages: {
      tabbable: `Elements with the "{{role}}" interactive role must be tabbable.`,
      focusable: `Elements with the "{{role}}" interactive role must be focusable.`
    },
    schema: [
      {
        type: "object",
        properties: {
          tabbable: {
            type: "array",
            items: {
              type: "string",
              enum: interactiveRoles,
              default: [
                "button",
                "checkbox",
                "link",
                "searchbox",
                "spinbutton",
                "switch",
                "textbox"
              ]
            },
            uniqueItems: true,
            additionalItems: false
          }
        }
      }
    ]
  },
  create(context) {
    return defineTemplateBodyVisitor(context, {
      KElement(node) {
        const role = getElementAttributeValue(node, "role");

        if (
          dom.has(getElementType(node)) &&
          hasOnDirectives(node, interactiveHandlers) &&
          !hasTabIndex(node) &&
          !isDisabledElement(node) &&
          !isHiddenFromScreenReader(node) &&
          !isPresentationRole(node) &&
          isInteractiveRole(role) &&
          !isInteractiveElement(node)
        ) {
          const tabbable: string[] = (context.options[0] || {}).tabbable || [];

          if (tabbable.includes(role)) {
            // Always tabbable, tabIndex = 0
            context.report({
              node: node as any,
              messageId: "tabbable",
              data: { role }
            });
          } else {
            // Focusable, tabIndex = -1 or 0
            context.report({
              node: node as any,
              messageId: "focusable",
              data: { role }
            });
          }
        }
      }
    });
  },
  interactiveHandlers,
  interactiveRoles
};

export default rule;
