import { Request, Response, NextFunction } from 'express';
import { templateService } from './template.service';
import { success, error, ErrorCode, paginatedSuccess } from '../../shared/utils';
import { AuthRequest } from '../../shared/middleware';

export class TemplateController {
  // 创建模板
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { name, description, content, fileUrl, fileKey, category, fields, tags, isPublic } = req.body;
      
      if (!name) {
        return res.json(error(ErrorCode.BAD_REQUEST, 'Name is required'));
      }
      
      const template = await templateService.create(userId, {
        name,
        description,
        content,
        fileUrl,
        fileKey,
        category,
        fields,
        tags,
        isPublic,
      });
      
      res.json(success(template, 'Template created'));
    } catch (err) {
      next(err);
    }
  }
  
  // 模板列表
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { page, pageSize, category, keyword } = req.query;
      
      const result = await templateService.list(userId, {
        page: parseInt(page as string) || 1,
        pageSize: parseInt(pageSize as string) || 10,
        category: category as string,
        keyword: keyword as string,
      });
      
      res.json(paginatedSuccess(result.templates, result.total, result.page, result.pageSize));
    } catch (err) {
      next(err);
    }
  }
  
  // 模板详情
  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      const template = await templateService.getById(userId, id);
      res.json(success(template));
    } catch (err) {
      next(err);
    }
  }
  
  // 更新模板
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { name, description, content, fileUrl, category, fields, tags, isPublic } = req.body;
      
      const template = await templateService.update(userId, id, {
        name,
        description,
        content,
        fileUrl,
        category,
        fields,
        tags,
        isPublic,
      });
      
      res.json(success(template, 'Template updated'));
    } catch (err) {
      next(err);
    }
  }
  
  // 删除模板
  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      const result = await templateService.delete(userId, id);
      res.json(success(result, 'Template deleted'));
    } catch (err) {
      next(err);
    }
  }
  
  // 使用模板创建合同
  async useTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { title, partyA, partyAAddress, partyB, partyBIdCard, partyBPhone, position, salary, startDate, endDate, signers } = req.body;
      
      if (!title || !signers || signers.length === 0) {
        return res.json(error(ErrorCode.BAD_REQUEST, 'Title and signers are required'));
      }
      
      const contract = await templateService.useTemplate(userId, id, { 
        title, 
        partyA, 
        partyAAddress, 
        partyB, 
        partyBIdCard, 
        partyBPhone, 
        position, 
        salary, 
        startDate, 
        endDate,
        signers 
      });
      res.json(success(contract, 'Contract created from template'));
    } catch (err) {
      next(err);
    }
  }
}

export const templateController = new TemplateController();
