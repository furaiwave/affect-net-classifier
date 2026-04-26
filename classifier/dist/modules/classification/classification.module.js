"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassificationModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const classification_controller_1 = require("./classification.controller");
const classification_service_1 = require("./classification.service");
let ClassificationModule = class ClassificationModule {
};
exports.ClassificationModule = ClassificationModule;
exports.ClassificationModule = ClassificationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule.register({
                timeout: 30_000,
                maxRedirects: 3,
            }),
        ],
        controllers: [classification_controller_1.ClassificationController],
        providers: [classification_service_1.ClassifyService]
    })
], ClassificationModule);
//# sourceMappingURL=classification.module.js.map