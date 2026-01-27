import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    firstName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    username: {
      type: String,
      unique: true,
      sparse: true, // Permite valores nulos únicos
      trim: true
    },
    profileImage: {
      type: String
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    // Sistema de roles - La DB es la fuente de verdad
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'CLIENT', 'USER'],
      default: 'USER',
      required: true,
      // Middleware para normalizar rol a uppercase antes de guardar
      set: function(value) {
        if (typeof value === 'string') {
          return value.toUpperCase().trim();
        }
        return value;
      }
    },
    // Permisos adicionales específicos (opcional)
    customPermissions: [{
      type: String,
      enum: [
        'MANAGE_USERS',
        'MANAGE_CONTENT', 
        'MANAGE_SERVICES',
        'MANAGE_UPLOADS',
        'VIEW_ANALYTICS',
        'MANAGE_SYSTEM',
        'MODERATE_CONTENT'
      ]
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    // Gestión de roles y permisos
    roleAssignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    roleAssignedAt: {
      type: Date,
      default: null
    },
    lastLogin: {
      type: Date
    },
    // Metadatos de Clerk
    clerkCreatedAt: {
      type: Date
    },
    clerkUpdatedAt: {
      type: Date
    },
    
    // ============================================
    // PERFIL PÚBLICO DEL BLOG
    // ============================================
    blogProfile: {
      // Información pública para el blog
      displayName: {
        type: String,
        trim: true,
        maxlength: 100,
        // Si no hay displayName, usar firstName + lastName
        default: function() {
            if (this.firstName || this.lastName) {
              return `${this.firstName || ''} ${this.lastName || ''}`.trim();
            }
            // Protege contra email undefined/null (evita .split() sobre undefined)
            if (this.email && typeof this.email === 'string') {
              return this.email.split('@')[0]; // Fallback al username del email
            }
            return 'Usuario'; // Fallback final
        }
      },
      bio: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
      },
      avatar: {
        type: String,
        default: '', // URL de Cloudinary o similar
        validate: {
          validator: function(v) {
            return !v || /^https?:\/\/.+/.test(v);
          },
          message: 'Avatar debe ser una URL válida'
        }
      },
      website: {
        type: String,
        trim: true,
        validate: {
          validator: function(v) {
            return !v || /^https?:\/\/.+/.test(v);
          },
          message: 'Website debe ser una URL válida'
        }
      },
      location: {
        type: String,
        trim: true,
        maxlength: 100,
        default: ''
      },
      // Áreas de expertise/especialización
      expertise: {
        type: [String],
        default: [],
        validate: {
          validator: function(arr) {
            return arr.length <= 10; // Máximo 10 especialidades
          },
          message: 'No puedes tener más de 10 especialidades'
        }
      },
      // Enlaces a redes sociales
      social: {
        facebook: {
          type: String,
          trim: true,
          validate: {
            validator: function(v) {
              if (!v) return true;
              // Permitir username, /username, URL con o sin protocolo
              return (
                /^[a-zA-Z0-9._-]+$/.test(v) || 
                /^\/[a-zA-Z0-9._-]+$/.test(v) || 
                /^(https?:\/\/)?(www\.)?facebook\.com\/.+/.test(v)
              );
            },
            message: 'Facebook debe ser username, /username o una URL válida de Facebook'
          }
        },
        tiktok: {
          type: String,
          trim: true,
          validate: {
            validator: function(v) {
              if (!v) return true;
              // Permitir @username, username, URL con o sin protocolo
              return (
                /^@?[a-zA-Z0-9._]+$/.test(v) || 
                /^(https?:\/\/)?(www\.)?tiktok\.com\/.+/.test(v)
              );
            },
            message: 'TikTok debe ser @username o una URL válida de TikTok'
          }
        },
        linkedin: {
          type: String,
          trim: true,
          validate: {
            validator: function(v) {
              if (!v) return true;
              // Permitir in/username, URL con o sin protocolo
              return (
                /^in\/[a-zA-Z0-9_-]+$/.test(v) || 
                /^(https?:\/\/)?(www\.)?linkedin\.com\/.+/.test(v)
              );
            },
            message: 'LinkedIn debe ser in/username o una URL válida de LinkedIn'
          }
        },
        github: {
          type: String,
          trim: true,
          validate: {
            validator: function(v) {
              if (!v) return true;
              // Permitir username, URL con o sin protocolo
              return (
                /^[a-zA-Z0-9_-]+$/.test(v) || 
                /^(https?:\/\/)?(www\.)?github\.com\/.+/.test(v)
              );
            },
            message: 'GitHub debe ser username o una URL válida de GitHub'
          }
        },
        orcid: {
          type: String,
          trim: true,
          validate: {
            validator: function(v) {
              return !v || /^https?:\/\/orcid\.org\/.+/.test(v);
            },
            message: 'ORCID debe ser una URL válida de ORCID'
          }
        }
      },
      // Configuración del perfil
      isPublicProfile: {
        type: Boolean,
        default: true // Por defecto, los perfiles son públicos
      },
      allowComments: {
        type: Boolean,
        default: true // Permitir comentarios en sus posts
      },
      showEmail: {
        type: Boolean,
        default: false // No mostrar email por defecto
      },
      // Metadatos del perfil
      profileCompleteness: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      lastProfileUpdate: {
        type: Date,
        default: Date.now
      }
    },
  
  // 📚 Historial de lectura del blog
  readingHistory: [{
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BlogPost'
    },
    lastReadAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number, // Porcentaje de lectura (0-100)
      default: 0,
      min: 0,
      max: 100
    },
    readCount: {
      type: Number, // Cuántas veces ha leído este post
      default: 1
    }
  }]
},
{
  timestamps: true, // createdAt, updatedAt automáticos
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para nombre completo
userSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.lastName || this.username || 'Usuario';
});

// Índice solo para consultas por fecha de creación
userSchema.index({ createdAt: -1 });

// Método para actualizar último login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Método estático para buscar por Clerk ID
userSchema.statics.findByClerkId = function(clerkId) {
  return this.findOne({ clerkId });
};

// Método estático para buscar o crear usuario
userSchema.statics.findOrCreate = async function(userData) {
  let user = await this.findOne({ clerkId: userData.clerkId });
  if (!user) {
    user = await this.create(userData);
  }
  return user;
};

// ============================================
// MÉTODOS PARA PERFIL DEL BLOG
// ============================================

// Método para calcular completitud del perfil
userSchema.methods.calculateProfileCompleteness = function() {
  const profile = this.blogProfile || {};
  let score = 0;
  let maxScore = 100;
  
  // Campos obligatorios (40 puntos)
  if (profile.displayName && profile.displayName.trim()) score += 15;
  if (profile.bio && profile.bio.trim()) score += 25;
  
  // Campos opcionales pero importantes (40 puntos)
  if (profile.avatar && profile.avatar.trim()) score += 20;
  if (profile.website && profile.website.trim()) score += 10;
  if (profile.location && profile.location.trim()) score += 10;
  
  // Expertise (10 puntos)
  if (profile.expertise && profile.expertise.length > 0) score += 10;
  
  // Redes sociales (10 puntos total)
  const socialLinks = Object.values(profile.social || {}).filter(link => link && link.trim());
  score += Math.min(socialLinks.length * 2.5, 10);
  
  return Math.round(score);
};

// Método para actualizar perfil público
userSchema.methods.updateBlogProfile = async function(profileData) {
  try {
    // Inicializar blogProfile si no existe
    if (!this.blogProfile) {
      this.blogProfile = {};
    }
    
    // Actualizar campos del perfil de manera segura
    const allowedFields = [
      'displayName', 'bio', 'avatar', 'website', 
      'location', 'expertise', 'isPublicProfile', 
      'showEmail', 'allowComments'
    ];
    
    // Actualizar campos simples
    allowedFields.forEach(key => {
      if (profileData[key] !== undefined) {
        this.blogProfile[key] = profileData[key];
      }
    });
    
    // Actualizar objetos anidados de manera especial
    if (profileData.social) {
      // Inicializar social si no existe
      if (!this.blogProfile.social) {
        this.blogProfile.social = {};
      }
      // Mantener valores existentes y actualizar solo los proporcionados
      this.blogProfile.social = {
        ...this.blogProfile.social.toObject(),
        ...profileData.social
      };
    }
    
    if (profileData.privacy) {
      // Inicializar privacy si no existe
      if (!this.blogProfile.privacy) {
        this.blogProfile.privacy = {};
      }
      this.blogProfile.privacy = {
        ...this.blogProfile.privacy.toObject(),
        ...profileData.privacy
      };
    }
    
    // Recalcular completitud
    this.blogProfile.profileCompleteness = this.calculateProfileCompleteness();
    this.blogProfile.lastProfileUpdate = new Date();
    
    // Marcar el campo como modificado para que Mongoose lo guarde
    this.markModified('blogProfile');
    
    return await this.save();
  } catch (error) {
    console.error('Error in updateBlogProfile:', error);
    throw error;
  }
};

// Método para obtener perfil público (sin datos sensibles)
userSchema.methods.getPublicProfile = function() {
  const profile = this.blogProfile || {};
  
  // Asegurar que expertise sea un array
  let expertiseArray = [];
  if (profile.expertise) {
    if (Array.isArray(profile.expertise)) {
      expertiseArray = profile.expertise;
    } else if (typeof profile.expertise === 'string') {
      expertiseArray = profile.expertise.split(',').map(e => e.trim()).filter(e => e);
    }
  }
  
  return {
    _id: this._id,
    username: this.username,
    displayName: profile.displayName || `${this.firstName || ''} ${this.lastName || ''}`.trim() || 'Usuario',
    bio: profile.bio || '',
    avatar: profile.avatar || this.profileImage, // Fallback a profileImage de Clerk
    website: profile.website || '',
    location: profile.location || '',
    expertise: expertiseArray,
    social: profile.social || {},
    isPublicProfile: profile.isPublicProfile !== false,
    profileCompleteness: profile.profileCompleteness || 0,
    // Solo mostrar email si el usuario lo permite
    email: profile.showEmail && this.email ? this.email : null,
    joinDate: this.createdAt,
    // Información adicional útil para la vista pública
    firstName: this.firstName,
    lastName: this.lastName
  };
};

// Virtual para nombre de usuario único (para URLs)
userSchema.virtual('publicUsername').get(function() {
  if (this.username) return this.username;
  
  // Generar username a partir del displayName o email
  let base = '';
  
  if (this.blogProfile && this.blogProfile.displayName) {
    base = this.blogProfile.displayName;
  } else if (this.email) {
    base = this.email.split('@')[0];
  } else {
    base = 'user' + this._id.toString().substring(0, 8);
  }
  
  return base.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);
});

// Método estático para buscar por username público
userSchema.statics.findByPublicUsername = function(username) {
  // Verificar si es un ObjectId válido
  if (mongoose.Types.ObjectId.isValid(username) && username.length === 24) {
    return this.findOne({ 
      _id: username,
      'blogProfile.isPublicProfile': true
    });
  }
  
  // Búsqueda por username, email o displayName
  return this.findOne({ 
    $or: [
      { username: username },
      { username: new RegExp(`^${username}$`, 'i') }, // Búsqueda case-insensitive exacta
      { 'blogProfile.displayName': new RegExp(`^${username}$`, 'i') }, // DisplayName exacto
      { 'blogProfile.displayName': new RegExp(username, 'i') }, // DisplayName que contenga
      { email: username }, // Por si buscan por email
      { email: new RegExp(`^${username}@`, 'i') } // Por la parte antes del @
    ],
    'blogProfile.isPublicProfile': true
  });
};

// Middleware para inicializar blogProfile en usuarios nuevos Y antiguos
userSchema.pre('save', function(next) {
  // Inicializar blogProfile si no existe (aplica a usuarios nuevos Y antiguos)
  if (!this.blogProfile || !this.blogProfile.displayName) {
    console.log(`⚠️ Inicializando blogProfile para ${this.email || this._id}`);
    
    this.blogProfile = {
      displayName: this.firstName 
        ? `${this.firstName} ${this.lastName || ''}`.trim() 
        : (this.email ? this.email.split('@')[0] : 'Usuario'),
      bio: this.blogProfile?.bio || '',
      avatar: this.blogProfile?.avatar || this.profileImage || '',
      website: this.blogProfile?.website || '',
      location: this.blogProfile?.location || '',
      expertise: this.blogProfile?.expertise || '',
      social: this.blogProfile?.social || {
        facebook: '',
        tiktok: '',
        linkedin: '',
        github: '',
        orcid: ''
      },
      isPublicProfile: this.blogProfile?.isPublicProfile !== false,
      allowComments: this.blogProfile?.allowComments !== false,
      showEmail: this.blogProfile?.showEmail || false,
      profileCompleteness: 0,
      lastProfileUpdate: new Date()
    };
  }
  
  // Asegurar que blogProfile existe antes de calcular completitud
  if (!this.blogProfile) {
    this.blogProfile = {};
  }
  
  // Calcular completitud al guardar
  if (this.isModified('blogProfile') || this.isNew) {
    this.blogProfile.profileCompleteness = this.calculateProfileCompleteness();
  }
  
  next();
});

// Métodos para gestión de roles
userSchema.methods.hasRole = function(role) {
  return this.role === role;
};

userSchema.methods.hasPermission = function(permission) {
  // Verificar permisos por rol
  const rolePermissions = {
    'SUPER_ADMIN': ['MANAGE_USERS', 'MANAGE_CONTENT', 'MANAGE_SERVICES', 'MANAGE_UPLOADS', 'VIEW_ANALYTICS', 'MANAGE_SYSTEM', 'MODERATE_CONTENT'],
    'ADMIN': ['MANAGE_USERS', 'MANAGE_CONTENT', 'MANAGE_SERVICES', 'MANAGE_UPLOADS', 'VIEW_ANALYTICS', 'MODERATE_CONTENT'],
    'MODERATOR': ['MANAGE_CONTENT', 'MODERATE_CONTENT', 'VIEW_ANALYTICS'],
    'CLIENT': ['MANAGE_UPLOADS'],
    'USER': []
  };
  
  const userPermissions = rolePermissions[this.role] || [];
  return userPermissions.includes(permission) || this.customPermissions.includes(permission);
};

userSchema.methods.canManageUser = function(targetUser) {
  const roleHierarchy = {
    'SUPER_ADMIN': 5,
    'ADMIN': 4,
    'MODERATOR': 3,
    'CLIENT': 2,
    'USER': 1
  };
  
  return roleHierarchy[this.role] > roleHierarchy[targetUser.role];
};

userSchema.methods.assignRole = function(newRole, assignedBy) {
  this.role = newRole;
  this.roleAssignedBy = assignedBy;
  this.roleAssignedAt = new Date();
  return this.save();
};

// Método estático para crear el primer super admin
userSchema.statics.createSuperAdmin = async function(userData) {
  const superAdminData = {
    ...userData,
    role: 'SUPER_ADMIN',
    roleAssignedAt: new Date()
  };
  return await this.create(superAdminData);
};

const User = mongoose.model('User', userSchema);

export default User;
