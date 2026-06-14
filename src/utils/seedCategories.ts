import { ServiceCategoryDef } from '../types';
import { CATEGORY_RISK_MAPPING } from '../constants';

const SERVICE_DETAILS: Record<string, { name: string, icon: string, desc: string, color: string }> = {
  'CLEANING': { name: 'Cleaning & Maid Services', icon: 'Droplet', desc: 'Deep cleaning, routine maid services, and move-in/out cleaning. Request anything from post-construction cleanups to specialized organizing.', color: 'text-emerald-500' },
  'MOVING': { name: 'Moving (With Travel)', icon: 'Truck', desc: 'Vehicle relocations, loading/unloading with transport, and A-to-B moves. If you just need heavy lifting or moving items within the same location, please select General Labor.', color: 'text-blue-600' },
  'HANDYMAN': { name: 'Handyman Services', icon: 'Wrench', desc: 'Minor home repairs, wall patching, picture hanging, and quick fixes. Got a unique repair or a custom build in mind? We can handle it.', color: 'text-amber-600' },
  'PLUMBING': { name: 'Plumbing Service', icon: 'Droplet', desc: 'Fixing leaks, unclogging drains, and basic installation. From dripping faucets to complex fixture replacements, our pros have you covered.', color: 'text-indigo-500' },
  'LANDSCAPING': { name: 'Landscaping & Yard', icon: 'Leaf', desc: 'Lawn mowing, yard cleanup, weeding, and basic gardening. Want a full garden redesign or seasonal property maintenance? Just let us know.', color: 'text-green-600' },
  'POWER_WASHING': { name: 'Power Washing', icon: 'Droplet', desc: 'Exterior home washing, driveway cleaning, and deck power washing. We can clean roofs, fences, patios, and almost any outdoor surface.', color: 'text-blue-400' },
  'COMPUTER': { name: 'Tech & Computer Help', icon: 'Laptop', desc: 'Virus removal, software help, and device setup assistance. From custom PC builds to complex network troubleshooting, just ask.', color: 'text-slate-700' },
  'SMART_HOME_INSTALL': { name: 'Smart Home Setup', icon: 'Smartphone', desc: 'Doorbell camera installation, smart thermostat setup, and network help. Want a fully integrated home automation system? We can do that.', color: 'text-teal-500' },
  'PEST_CONTROL': { name: 'Pest Control', icon: 'Bug', desc: 'Basic extermination services and preventative pest treatments. Dealing with a unique infestation or need wildlife removal? Let us know what you need.', color: 'text-red-500' },
  'FURNITURE_ASSEMBLY': { name: 'Furniture Assembly', icon: 'Hammer', desc: 'IKEA assemblies, bed frames, desks, and patio furniture. We can also handle complex playsets, exercise equipment, and custom shelving.', color: 'text-orange-500' },
  'GUTTER_CLEANING': { name: 'Gutter Cleaning', icon: 'Home', desc: 'Clearing out debris, leaf removal, and downspout flushing. We also offer gutter guard installation, minor repairs, and roof sweeping.', color: 'text-slate-800' },
  'GENERAL_LABOR': { name: 'General Labor & Lifting', icon: 'HardHat', desc: 'On-site heavy lifting, furniture rearranging, loading/unloading, and event setup. Perfect for physical tasks and moving items that do not require traveling to a second location.', color: 'text-yellow-600' },
  'JOBSITE_LABOR': { name: 'Jobsite Labor', icon: 'HardHat', desc: 'A professional job site laborer provides physical support for construction projects. They are reliable, skilled in tasks like digging, cleaning, and assisting tradespeople, and work to keep projects running efficiently, safely, and on schedule.', color: 'text-yellow-600' },
  'AUTO': { name: 'Auto Services', icon: 'Car', desc: 'Mobile car washing, basic detailing, and minor roadside assistance. Need help with brake pads, oil changes, or a dead battery? Just put in a request.', color: 'text-zinc-600' },
  'CONSTRUCTION': { name: 'Construction', icon: 'Hammer', desc: 'General construction and framing.', color: 'text-orange-600' },
  'WEB_APP_DEV': { name: 'Web App Dev', icon: 'Laptop', desc: 'Web development and software services.', color: 'text-indigo-600' }
};

export const generateDefaultCategories = (): ServiceCategoryDef[] => {
  return Object.keys(SERVICE_DETAILS).map(id => {
    const details = SERVICE_DETAILS[id];
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let minimumFee = 3.0;

    const riskMapping = (CATEGORY_RISK_MAPPING as any)[id];
    if (riskMapping) {
      riskLevel = riskMapping.risk as any;
    }
    
    // Fallbacks
    if (id === 'MOVING' || id === 'PLUMBING' || id === 'CONSTRUCTION' || id === 'AUTO' || id === 'JOBSITE_LABOR' || id === 'POWER_WASHING' || id === 'PEST_CONTROL' || id === 'GUTTER_CLEANING') riskLevel = 'HIGH';
    if (id === 'LANDSCAPING' || id === 'HANDYMAN' || id === 'GENERAL_LABOR' || id === 'SMART_HOME_INSTALL' || id === 'FURNITURE_ASSEMBLY') riskLevel = 'MEDIUM';
    
    if (riskLevel === 'MEDIUM') minimumFee = 5.0;
    if (riskLevel === 'HIGH') minimumFee = 12.0;

    return {
      id,
      name: details.name,
      description: details.desc,
      iconName: details.icon,
      colorClass: details.color,
      riskLevel,
      minimumFee,
      isActive: true,
      isPublic: true
    };
  });
};
