import { ModelProvider, ModelRequest, ModelResponse, ModelCapabilities } from '../types';

export class LocalProvider implements ModelProvider {
  name = 'local';
  
  capabilities: ModelCapabilities = {
    supportsVision: false,
    supportsFunctionCalling: false,
    maxTokens: 4096,
  };

  async generate(request: ModelRequest): Promise<ModelResponse> {
    let mockStructured = null;
    let mockText = "Processed local response.";
    
    if (request.requireStructuredOutput) {
      // ── Employee work cycle (Alice/Bob) ─────────────────────────────────────
      if ((request.prompt.includes('Improve the company') || request.prompt.includes('"role":"Engineer"')) && !request.prompt.includes('Project Manager') && !request.prompt.includes('companyOperations')) {
        let taskId = 'mock-task-id';
        try {
          const contextObj = JSON.parse(request.prompt);
          if (contextObj?.tasks?.length > 0) {
            taskId = contextObj.tasks[0].id;
          }
        } catch(e) {}

        return {
          text: "I should check my tasks and start working.",
          structuredOutput: {
            thought_summary: "I have a goal to improve API reliability. I will view my tasks and start the first one, then complete it.",
            actions: [
              { type: 'VIEW_MY_TASKS', parameters: {} },
              { type: 'START_MY_TASK', parameters: { taskId } },
              { type: 'UPDATE_MY_TASK_PROGRESS', parameters: { taskId, progress: 50 } },
              { type: 'COMPLETE_MY_TASK', parameters: { taskId } }
            ]
          },
          provider: 'local',
          model: 'local-stub',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
        };
      }

      // ── AI Receptionist ──────────────────────────────────────────────────────
      if (request.prompt.includes('RECEPTIONIST_INQUIRY')) {
        return {
          text: "I will process the new inquiry.",
          structuredOutput: {
            thought_summary: "I see a new inquiry. I will qualify it and send it to Sales.",
            actions: [
              { type: 'VIEW_COMPANY_CAPABILITIES', parameters: {} },
              { type: 'CREATE_INQUIRY', parameters: { title: 'New Web Project', description: 'They need a web app', budget: 150000 } },
              { type: 'QUALIFY_INQUIRY', parameters: { } }
            ]
          },
          provider: 'local',
          model: 'local-stub',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
        };
      }

      // ── AI Project Manager ───────────────────────────────────────────────────
      if (request.prompt.includes('Project Manager') || request.prompt.includes('managedProjects')) {
        const actions: any[] = [{ type: 'VIEW_PROJECT', parameters: {} }];

        try {
          const contextObj = JSON.parse(request.prompt);
          const projects = contextObj?.managedProjects || [];

          for (const project of projects) {
            // If no plan exists, create one
            if (!project.activePlanExists) {
              actions.push({
                type: 'CREATE_PROJECT_PLAN',
                parameters: {
                  projectId: project.id,
                  summary: `Delivery plan for ${project.name}`,
                  assumptions: 'Team available, requirements stable',
                  estimatedDuration: 30
                }
              });
            }

            // If requirements exist but no tasks, create initial tasks
            if (project.requirementsCount > 0 && project.pendingTasks === 0) {
              actions.push({
                type: 'CREATE_PROJECT_TASK',
                parameters: {
                  projectId: project.id,
                  title: 'Requirements Analysis',
                  description: 'Analyze and clarify project requirements',
                  priority: 'HIGH',
                  estimatedEffort: 3
                }
              });
            }

            // If team has tasks but no milestone yet, create one
            if (project.milestones.length === 0 && project.requirementsCount > 0) {
              actions.push({
                type: 'CREATE_PROJECT_MILESTONE',
                parameters: {
                  projectId: project.id,
                  name: 'Phase 1: Foundation',
                  description: 'Core architecture and initial setup',
                  sequence: 1
                }
              });
            }
          }
        } catch(e) {}

        return {
          text: 'I am reviewing my managed projects and planning work.',
          structuredOutput: { thought_summary: 'Reviewing projects and scheduling work.', actions },
          provider: 'local',
          model: 'local-stub',
          finishReason: 'stop',
          usage: { promptTokens: 20, completionTokens: 40, totalTokens: 60 }
        };
      }

      // ── AI Company Management (Phase 6C) ─────────────────────────────────────
      if (request.prompt.includes('companyOperations') || request.prompt.includes('"role":"CEO"')) {
        const actions: any[] = [{ type: 'VIEW_COMPANY_METRICS', parameters: {} }];
        
        try {
          const contextObj = JSON.parse(request.prompt);
          const ops = contextObj?.companyOperations;
          const alerts = ops?.activeAlerts || [];
          
          const sys = request.systemMessage || request.prompt;
          const targetEmpId = sys.match(/TARGET_EMP=([^\s]+)/)?.[1] || 'target-emp-id';
          const sourceEmpId = sys.match(/SOURCE_EMP=([^\s]+)/)?.[1] || 'source-emp-id';
          const blockedTaskId = sys.match(/BLOCKED_TASK=([^\s]+)/)?.[1] || 'blocked-task-id';
          const engDeptId = sys.match(/ENG_DEPT=([^\s]+)/)?.[1] || 'dept-id';

          if (alerts.some((a: any) => a.category === 'TASK_OVERDUE' || a.category === 'TASK_BLOCKED')) {
            actions.push({
              type: 'CREATE_WORKLOAD_REBALANCING_PROPOSAL',
              parameters: {
                title: 'Reassign overdue task',
                description: 'Employee is overloaded',
                employeeId: sourceEmpId,
                taskId: blockedTaskId,
                newAssigneeId: targetEmpId
              }
            });
            actions.push({
              type: 'CREATE_TRAINING_RECOMMENDATION',
              parameters: {
                employeeId: sourceEmpId,
                skillName: 'TypeScript',
                skillCategory: 'Engineering'
              }
            });
          }

          if (ops?.metrics?.activeEmployees < 20) {
             actions.push({
               type: 'CREATE_HIRING_REQUEST',
               parameters: {
                 roleTitle: 'Senior Engineer',
                 departmentId: engDeptId,
                 headcount: 1
               }
             });
             
             actions.push({
               type: 'CREATE_PROMOTION_PROPOSAL',
               parameters: {
                 employeeId: targetEmpId,
                 newRoleId: 'new-role-id',
                 title: 'Promote to Senior',
                 description: 'Great performance'
               }
             });
          }
        } catch (e) {}

        return {
          text: 'I am reviewing company operations.',
          structuredOutput: { thought_summary: 'Managing company operations.', actions },
          provider: 'local',
          model: 'local-stub',
          finishReason: 'stop',
          usage: { promptTokens: 20, completionTokens: 40, totalTokens: 60 }
        };
      }

      // ── Security / adversarial probes ────────────────────────────────────────
      if (request.prompt.includes('HACK_SYSTEM') || request.prompt.includes('EXECUTE_SQL') || request.prompt.includes("malicious")) {
        mockStructured = {
          actions: [{ type: "EXECUTE_SQL", parameters: { query: "DROP TABLE" } }]
        };
      } else if (request.prompt.includes("invalid-action")) {
        mockStructured = {
          actions: [{ type: "SOMETHING_MADE_UP", parameters: {} }]
        };
      } else {
        mockStructured = {
          thought_summary: "I will view the company details.",
          actions: [{ type: "VIEW_COMPANY", parameters: {} }]
        };
      }
      mockText = JSON.stringify(mockStructured);
    }

    return {
      text: mockText,
      structuredOutput: mockStructured,
      provider: 'local',
      model: 'local-stub',
      finishReason: 'stop',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      }
    };
  }
}
